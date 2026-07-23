import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

const expoExtra = Constants.expoConfig?.extra || {};
const apiKey =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  expoExtra.EXPO_PUBLIC_GEMINI_API_KEY ||
  expoExtra.GEMINI_API_KEY ||
  expoExtra.GEMINI_API_KEY ||
  '';

const model =
  process.env.EXPO_PUBLIC_GEMINI_MODEL ||
  expoExtra.EXPO_PUBLIC_GEMINI_MODEL ||
  'gemini-2.0-flash';

const aiProvider =
  (process.env.EXPO_PUBLIC_AI_PROVIDER || expoExtra.EXPO_PUBLIC_AI_PROVIDER || 'gemini').toLowerCase();

const openRouterApiKey =
  process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ||
  expoExtra.EXPO_PUBLIC_OPENROUTER_API_KEY ||
  '';

const openRouterModel =
  process.env.EXPO_PUBLIC_OPENROUTER_MODEL ||
  expoExtra.EXPO_PUBLIC_OPENROUTER_MODEL ||
  'openai/gpt-4o-mini';

const getPrompt = (itemType = 'object', status = 'lost') => {
  const categoryLabel = itemType === 'animal'
    ? 'animal'
    : itemType === 'document'
      ? 'documento'
      : itemType === 'electronics'
        ? 'eletrônico'
        : itemType === 'jewelry'
          ? 'joia/acessório'
          : itemType === 'clothing'
            ? 'roupa'
            : itemType === 'outro'
              ? 'outro item'
              : 'objeto';

  return `Analise a imagem e devolva APENAS um JSON válido, sem markdown. O item é um ${categoryLabel} e a situação é ${status === 'found' ? 'encontrado' : 'perdido'}. Responda com os campos mais úteis do formulário. Para animal: animal_name, species, breed, color, size, age, collar, description. Para outros: title, description, brand, color, serial_number. Se não tiver certeza, use respostas curtas e realistas. Formato exato: {"title":"...","description":"...","brand":"...","color":"...","serial_number":"...","animal_name":"...","species":"...","breed":"...","size":"...","age":"...","collar":"..."}`;
};

const guessMimeType = (uri = '') => {
  const normalized = String(uri).toLowerCase();
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.webp')) return 'image/webp';
  if (normalized.endsWith('.heic') || normalized.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
};

const extractJson = (text = '') => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch (error) {
    return null;
  }
};

const getFriendlyErrorMessage = (errorText = '', statusCode = 0) => {
  const normalized = String(errorText).toLowerCase();
  if (statusCode === 429 || normalized.includes('429') || normalized.includes('quota') || normalized.includes('resource_exhausted')) {
    return 'A IA ficou sem quota gratuita no momento. Você pode continuar preenchendo manualmente ou tentar novamente em alguns minutos.';
  }

  if (normalized.includes('api key') || normalized.includes('key not valid')) {
    return 'A chave da API do Gemini parece inválida. Verifique o valor no arquivo .env.';
  }

  return 'Não foi possível gerar as informações com IA no momento. Você pode continuar preenchendo manualmente.';
};

const getFallbackSuggestions = ({ itemType = 'object', status = 'lost' }) => {
  const normalizedStatus = status === 'found' ? 'encontrado' : 'perdido';
  const categoryLabel = itemType === 'animal'
    ? 'animal'
    : itemType === 'document'
      ? 'documento'
      : itemType === 'electronics'
        ? 'eletrônico'
        : itemType === 'jewelry'
          ? 'joia/acessório'
          : itemType === 'clothing'
            ? 'roupa'
            : itemType === 'outro'
              ? 'item'
              : 'item';

  if (itemType === 'animal') {
    return {
      title: `Animal ${normalizedStatus}`,
      description: 'Foto anexada. Revise os campos antes de publicar.',
      brand: 'Não informado',
      color: 'Não informado',
      serial_number: 'Não informado',
      animal_name: 'Animal',
      species: 'Não informado',
      breed: 'Não informado',
      size: 'Não informado',
      age: 'Não informado',
      collar: 'Não informado',
      source: 'fallback',
    };
  }

  return {
    title: `${categoryLabel} ${normalizedStatus}`,
    description: 'Foto anexada. Revise os campos antes de publicar.',
    brand: 'Não informado',
    color: 'Não informado',
    serial_number: 'Não informado',
    animal_name: '',
    species: '',
    breed: '',
    size: '',
    age: '',
    collar: '',
    source: 'fallback',
  };
};

export const analyzeItemWithVision = async ({ imageUri, itemType = 'object', status = 'lost' }) => {
  console.log('[aiItemSuggestions] Iniciando análise com IA', { itemType, status, imageUri });

  if (!imageUri) {
    console.error('[aiItemSuggestions] Nenhuma imagem recebida para análise.');
    throw new Error('Selecione uma foto para gerar as informações com IA.');
  }

  const canUseOpenRouter = aiProvider === 'openrouter' && openRouterApiKey;
  const canUseGemini = aiProvider === 'gemini' && apiKey;

  if (!canUseOpenRouter && !canUseGemini) {
    console.warn('[aiItemSuggestions] Nenhuma chave de IA configurada; usando sugestão local.');
    return getFallbackSuggestions({ itemType, status });
  }

  let base64Image = '';
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        { resize: { width: 1200 } },
      ],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );

    base64Image = await FileSystem.readAsStringAsync(manipulated.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (error) {
    console.error('[aiItemSuggestions] Falha ao ler ou comprimir a imagem local:', error);
    throw error;
  }

  try {
    const providerName = aiProvider === 'openrouter' ? 'OpenRouter' : 'Gemini';
    const requestBody = aiProvider === 'openrouter'
      ? {
          model: openRouterModel,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: getPrompt(itemType, status) },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${guessMimeType(imageUri)};base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          response_format: { type: 'json_object' },
        }
      : {
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: guessMimeType(imageUri),
                    data: base64Image,
                  },
                },
                {
                  text: getPrompt(itemType, status),
                },
              ],
            },
          ],
        };

    const response = await fetch(
      aiProvider === 'openrouter'
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: aiProvider === 'openrouter'
          ? {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openRouterApiKey}`,
              'HTTP-Referer': 'https://recover-app.local',
              'X-Title': 'RECOVER App',
            }
          : {
              'Content-Type': 'application/json',
            },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[aiItemSuggestions] Erro HTTP da API ${providerName}:`, { status: response.status, body: errorText, itemType, status });
      console.warn('[aiItemSuggestions] Falha na API externa; usando sugestão local.', getFriendlyErrorMessage(errorText, response.status));
      return getFallbackSuggestions({ itemType, status });
    }

    const payload = aiProvider === 'openrouter'
      ? await response.json()
      : await response.json();

    const text = aiProvider === 'openrouter'
      ? payload?.choices?.[0]?.message?.content || ''
      : payload?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('') || '';

    const parsed = extractJson(text);

    if (!parsed) {
      console.error('[aiItemSuggestions] A IA não retornou JSON válido. Resposta recebida:', text);
      return getFallbackSuggestions({ itemType, status });
    }

    console.log('[aiItemSuggestions] Resposta da IA recebida:', parsed);

    return {
      title: parsed.title || '',
      description: parsed.description || '',
      brand: parsed.brand || '',
      color: parsed.color || '',
      serial_number: parsed.serial_number || '',
      animal_name: parsed.animal_name || '',
      species: parsed.species || '',
      breed: parsed.breed || '',
      size: parsed.size || '',
      age: parsed.age || '',
      collar: parsed.collar || '',
      source: aiProvider === 'openrouter' ? 'openrouter' : 'gemini',
    };
  } catch (error) {
    console.error('[aiItemSuggestions] Falha no fluxo de geração com IA:', error);
    return getFallbackSuggestions({ itemType, status });
  }
};
