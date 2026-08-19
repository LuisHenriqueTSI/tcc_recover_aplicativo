// Lista de estados do Brasil
export const states = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// Lista de cidades do RS (exemplo, adicione mais conforme necessário)
export const citiesByState = {
  RS: [
    'Pelotas',
    'Porto Alegre',
    'Rio Grande',
    'Canoas',
    'Santa Maria',
    'Caxias do Sul',
    'Gravataí',
    'Viamão',
    'Novo Hamburgo',
    'São Leopoldo',
    // ...
  ],
  SP: [
    'São Paulo',
    'Campinas',
    'Santos',
    'Sorocaba',
    // ...
  ],
  // ...outros estados
};

// Lista de bairros por cidade (exemplo, adicione mais conforme necessário)
export const neighborhoodsByCity = {
  Pelotas: [
    'Centro',
    'Três Vendas',
    'Areal',
    'Fragata',
    'Laranjal',
    'Porto',
    'Simões Lopes',
    // ...
  ],
  'Porto Alegre': [
    'Moinhos de Vento',
    'Centro Histórico',
    'Cidade Baixa',
    'Menino Deus',
    // ...
  ],
  // ...outras cidades
};
