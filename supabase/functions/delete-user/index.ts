const getCorsHeaders = (request: Request) => {
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
  const origin = request.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0] ?? 'null',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

const jsonResponse = (body: Record<string, unknown>, status = 200, request?: Request) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(request ?? new Request('http://localhost')), 'Content-Type': 'application/json' },
  });

type StoragePaths = Record<string, string[]>;

const addPath = (paths: StoragePaths, bucket: string, path: string) => {
  const normalizedPath = path.replace(/^\/+/, '');
  if (!normalizedPath) return;
  const bucketPaths = paths[bucket] || [];
  if (!bucketPaths.includes(normalizedPath)) bucketPaths.push(normalizedPath);
  paths[bucket] = bucketPaths;
};

const addStorageUrl = (paths: StoragePaths, value: unknown) => {
  if (typeof value !== 'string' || !value) return;
  const match = value.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/?#]+)\/([^?#]+)/);
  if (!match) return;
  try {
    addPath(paths, decodeURIComponent(match[1]), decodeURIComponent(match[2]));
  } catch (error) {
    throw new Error(`Não foi possível interpretar o caminho de um arquivo: ${error.message}`);
  }
};

const collectStorageUrls = (paths: StoragePaths, value: unknown) => {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectStorageUrls(paths, entry));
    return;
  }
  if (!value || typeof value !== 'object') {
    addStorageUrl(paths, value);
    return;
  }
  Object.values(value).forEach((entry) => collectStorageUrls(paths, entry));
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(request) });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method-not-allowed', message: 'Método não permitido.' }, 405, request);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.match(/^Bearer\s+\S+$/i)) {
    return jsonResponse({ error: 'unauthorized', message: 'Faça login novamente e tente outra vez.' }, 401, request);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('[delete-user] Configuração necessária da função está ausente.');
    return jsonResponse({ error: 'server-configuration-error', message: 'O serviço de exclusão está indisponível.' }, 500);
  }

  const baseUrl = supabaseUrl.replace(/\/$/, '');
  const serviceHeaders = {
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
    'Content-Type': 'application/json',
  };

  try {
    const userResponse = await fetch(`${baseUrl}/auth/v1/user`, {
      headers: { Authorization: authorization, apikey: anonKey },
    });
    if (!userResponse.ok) {
      return jsonResponse({ error: 'unauthorized', message: 'Sua sessão expirou. Entre novamente e tente outra vez.' }, 401);
    }

    const authenticatedUser = await userResponse.json();
    const userId = authenticatedUser?.id;
    if (typeof userId !== 'string' || !userId) {
      return jsonResponse({ error: 'unauthorized', message: 'Não foi possível validar sua sessão.' }, 401);
    }

    const requestRows = async (table: string, query: string, optional = false) => {
      const rows: Record<string, unknown>[] = [];
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        const response = await fetch(
          `${baseUrl}/rest/v1/${table}?${query}`,
          {
            headers: {
              ...serviceHeaders,
              Range: `${offset}-${offset + pageSize - 1}`,
              'Range-Unit': 'items',
            },
          },
        );
        if (!response.ok) {
          const body = await response.text();
          if (optional && response.status === 404 && body.includes('PGRST205')) {
            console.info(`[delete-user] Tabela opcional ausente: ${table}`);
            return [];
          }
          throw new Error(`Falha ao preparar exclusão (${table}): ${body}`);
        }
        const page = await response.json() as Record<string, unknown>[];
        rows.push(...page);
        if (page.length < pageSize) return rows;
      }
    };

    const storagePaths: StoragePaths = {};
    const [profiles, items, messages, authoredStories] = await Promise.all([
      requestRows('profiles', `select=avatar_path,avatar_url&id=eq.${userId}`),
      requestRows('items', `select=id&owner_id=eq.${userId}`),
      requestRows('messages', `select=photo_url&or=(sender_id.eq.${userId},receiver_id.eq.${userId})`),
      requestRows('success_stories', `select=photo_url&user_id=eq.${userId}`, true),
    ]);
    collectStorageUrls(storagePaths, profiles);
    collectStorageUrls(storagePaths, messages);
    collectStorageUrls(storagePaths, authoredStories);
    for (const profile of profiles) {
      if (profile.avatar_path) addPath(storagePaths, 'profile-photos', profile.avatar_path);
    }

    const itemIds = (items || []).map((item: { id: number | string }) => item.id).filter(Boolean);
    const authoredSightings = await requestRows('sightings', `select=*&user_id=eq.${userId}`, true);
    collectStorageUrls(storagePaths, authoredSightings);
    if (itemIds.length > 0) {
      const itemFilter = `in.(${itemIds.join(',')})`;
      const [itemPhotos, sightings, claims] = await Promise.all([
        requestRows('item_photos', `select=*&item_id=${itemFilter}`, true),
        requestRows('sightings', `select=*&item_id=${itemFilter}`, true),
        requestRows('item_claims', `select=*&item_id=${itemFilter}`, true),
      ]);
      collectStorageUrls(storagePaths, itemPhotos);
      collectStorageUrls(storagePaths, sightings);
      collectStorageUrls(storagePaths, claims);
    }
    const userClaims = await requestRows('item_claims', `select=*&claimant_id=eq.${userId}`, true);
    collectStorageUrls(storagePaths, userClaims);

    const prepareResponse = await fetch(`${baseUrl}/rest/v1/rpc/prepare_account_deletion`, {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({ p_user_id: userId, p_storage_paths: storagePaths }),
    });
    if (!prepareResponse.ok) {
      const body = await prepareResponse.text();
      console.error('[delete-user] A limpeza transacional do banco falhou:', body);
      return jsonResponse({
        error: 'account-cleanup-failed',
        message: 'Não foi possível preparar a exclusão dos dados. A conta continua ativa; tente novamente ou contate o suporte.',
      }, 502);
    }

    const savedPaths = await prepareResponse.json() as StoragePaths;
    for (const [bucket, paths] of Object.entries(savedPaths || {})) {
      for (let offset = 0; offset < paths.length; offset += 100) {
        const storageResponse = await fetch(`${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}`, {
          method: 'DELETE',
          headers: serviceHeaders,
          body: JSON.stringify({ prefixes: paths.slice(offset, offset + 100) }),
        });
        if (!storageResponse.ok) {
          const body = await storageResponse.text();
          console.error(`[delete-user] Falha ao remover arquivos do bucket ${bucket}:`, body);
          return jsonResponse({
            error: 'account-storage-cleanup-failed',
            message: 'A exclusão foi pausada porque alguns arquivos não puderam ser removidos. Tente novamente; a conta não será encerrada até concluir a limpeza.',
          }, 502);
        }
      }
    }

    const deleteResponse = await fetch(
      `${baseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
      { method: 'DELETE', headers: serviceHeaders },
    );
    if (!deleteResponse.ok) {
      const body = await deleteResponse.text();
      console.error('[delete-user] Supabase Auth recusou a exclusão:', deleteResponse.status, body);
      return jsonResponse({
        error: 'account-deletion-failed',
        message: 'Os dados já foram limpos, mas não foi possível encerrar a conta. Entre novamente e tente excluir mais uma vez ou contate o suporte.',
      }, 502);
    }

    const completionResponse = await fetch(`${baseUrl}/rest/v1/rpc/complete_account_deletion`, {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({ p_user_id: userId }),
    });
    if (!completionResponse.ok) {
      console.error('[delete-user] Conta excluída; não foi possível finalizar o registro temporário:', await completionResponse.text());
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('[delete-user] Falha ao excluir conta:', error);
    return jsonResponse({
      error: 'account-deletion-failed',
      message: error instanceof Error
        ? `Não foi possível concluir a exclusão: ${error.message}`
        : 'Ocorreu um erro ao excluir a conta. Tente novamente.',
    }, 500);
  }
});
