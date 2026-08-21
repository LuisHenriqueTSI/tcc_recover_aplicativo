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

  const statusLabel = status === 'found' ? 'encontrado' : 'perdido';

  return `Analise a imagem e devolva APENAS um JSON válido, sem markdown. O item é um ${categoryLabel} e a situação é ${statusLabel}. Responda com os campos mais úteis do formulário. Regras estritas: 1) Responda somente em português do Brasil. 2) Não use termos em inglês. 3) Para animal, preencha os campos com maior atenção: species, gender, breed, size, age, color e description. 4) Para gender, escolha: Macho, Fêmea ou Não informado. 5) Se a raça for claramente visível, chame de breed com o nome correto. Se não for possível identificar, coloque "Sem raça definida" no breed. 6) Para size, escolha apenas: Pequeno, Médio, Grande ou Gigante. 7) Para age, escolha apenas: Filhote, Adulto, Idoso ou Não informado. 8) Para color, use a cor principal do animal; se for multicolorido, descreva a mistura mais visível. 9) A description deve ser uma frase natural, mas curta, unindo as informações principais em uma linha. Exemplos: "Cachorro macho de porte médio, adulto, pelagem marrom, ${statusLabel}."; "Gata fêmea de porte pequeno, filhote, pelagem preta e branca, ${statusLabel}." 10) A descrição deve soar natural, como uma observação curta do animal, e não como lista técnica. 11) Não descreva fundo, rua, terreno, objetos, pessoas ou cenário. 12) Para outros itens, siga o padrão normal. Formato exato: {"title":"...","description":"...","brand":"...","color":"","serial_number":"...","animal_name":"...","species":"...","gender":"...","breed":"...","size":"...","age":"...","collar":"..."}`;
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

const getPetValidationPrompt = () => `Analise a imagem e devolva APENAS um JSON válido, sem markdown. Verifique se a imagem mostra um ANIMAL visível, incluindo cachorros, gatos, bovinos, cavalos, aves e outros animais. Responda em português do Brasil. Regras: 1) Só responda is_pet false quando a imagem estiver claramente mostrando algo que não é animal, como pessoa, objeto, documento, cenário, prédio, comida, rua vazia, ou outra coisa sem animal visível. 2) Se houver qualquer chance real de ser um animal, mesmo distante, parcial ou em baixa qualidade, responda is_pet true. 3) Não rejeite por dúvida. 4) Responda somente neste formato exato: {"is_pet": true, "pet_type": "bovino", "confidence": 75}`;

export const validatePetPhoto = async ({ imageUri }) => {
  if (!imageUri) {
    throw new Error('Selecione uma foto para validar antes de publicar.');
  }

  const canUseOpenRouter = aiProvider === 'openrouter' && openRouterApiKey;
  const canUseGemini = aiProvider === 'gemini' && apiKey;

  if (!canUseOpenRouter && !canUseGemini) {
    console.warn('[validatePetPhoto] IA indisponível; aceitando imagem para não bloquear envio válido.');
    return { isPet: true, petType: 'animal', confidence: 0, source: 'manual-fallback' };
  }

  let base64Image = '';
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 1200 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    base64Image = await FileSystem.readAsStringAsync(manipulated.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (error) {
    console.error('[validatePetPhoto] Falha ao preparar imagem:', error);
    return { isPet: true, petType: 'animal', confidence: 0, source: 'manual-fallback' };
  }

  try {
    const requestBody = aiProvider === 'openrouter'
      ? {
          model: openRouterModel,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: getPetValidationPrompt() },
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
                  text: getPetValidationPrompt(),
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
              'HTTP-Referer': 'https://wefind-app.local',
              'X-Title': 'WeFIND App',
            }
          : {
              'Content-Type': 'application/json',
            },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[validatePetPhoto] Falha ao validar pet com IA:', errorText);
      return { isPet: true, petType: 'animal', confidence: 0, source: 'manual-fallback' };
    }

    const payload = await response.json();
    const text = aiProvider === 'openrouter'
      ? payload?.choices?.[0]?.message?.content || ''
      : payload?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('') || '';

    const parsed = extractJson(text) || {};
    const hasExplicitNegative = parsed.is_pet === false || parsed.is_animal === false;
    const hasExplicitPositive = parsed.is_pet === true || parsed.is_animal === true;
    const confidence = Number(parsed.confidence) || 0;
    const responseText = String(text || '').toLowerCase();
    const hasAnimalSignal = /(cachorro|gato|bovino|cavalo|ave|animal|pet|dog|cat|cow|horse|bird|mammal)/i.test(responseText);
    const hasClearNonAnimalSignal = /(pessoa|humano|objeto|documento|prédio|predio|comida|rua|vazia|sem animal|nenhum animal)/i.test(responseText);

    const isPet = hasExplicitNegative
      ? false
      : hasExplicitPositive
        ? true
        : (confidence >= 60 && hasAnimalSignal && !hasClearNonAnimalSignal) || (hasAnimalSignal && !hasClearNonAnimalSignal);

    return {
      isPet,
      petType: typeof parsed.pet_type === 'string' ? parsed.pet_type : (typeof parsed.animal_type === 'string' ? parsed.animal_type : 'animal'),
      confidence,
      source: aiProvider === 'openrouter' ? 'openrouter' : 'gemini',
    };
  } catch (error) {
    console.error('[validatePetPhoto] Erro na validação de foto:', error);
    return { isPet: false, petType: 'unknown', confidence: 0, source: 'manual-fallback' };
  }
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
              'HTTP-Referer': 'https://wefind-app.local',
              'X-Title': 'WeFIND App',
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
