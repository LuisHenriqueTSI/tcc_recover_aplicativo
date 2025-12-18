// Serviço para buscar estados e cidades do Brasil usando API do IBGE
const IBGE_API_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades';

let statesCache = null;
const citiesCache = {};

export const getStates = async () => {
  try {
    if (statesCache) {
      return statesCache;
    }
    const response = await fetch(`${IBGE_API_BASE}/estados?orderBy=nome`);
    const data = await response.json();
    const formatted = data.map(state => ({
      id: state.id,
      sigla: state.sigla,
      nome: state.nome,
    }));
    statesCache = formatted;
    return formatted;
  } catch (error) {
    console.error('[getStates] Erro ao buscar estados:', error);
    throw new Error('Falha ao carregar estados');
  }
};

export const getCitiesByState = async (stateSigla) => {
  try {
    if (!stateSigla) {
      return [];
    }
    if (citiesCache[stateSigla]) {
      return citiesCache[stateSigla];
    }
    const response = await fetch(`${IBGE_API_BASE}/estados/${stateSigla}/municipios?orderBy=nome`);
    const data = await response.json();
    const formatted = data.map(city => ({
      id: city.id,
      nome: city.nome,
    }));
    citiesCache[stateSigla] = formatted;
    return formatted;
  } catch (error) {
    console.error('[getCitiesByState] Erro ao buscar cidades:', error);
    throw new Error('Falha ao carregar cidades');
  }
};

export const clearCache = () => {
  statesCache = null;
  Object.keys(citiesCache).forEach(key => delete citiesCache[key]);
};
