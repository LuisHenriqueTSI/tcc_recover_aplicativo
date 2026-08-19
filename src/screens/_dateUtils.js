// Função utilitária para formatar datas do Supabase para "Membro desde ..."
export function formatarDataMembro(dateString) {
  if (!dateString) return 'não informado';
  let dateObj;
  // Tenta criar a partir do formato ISO (com ou sem milissegundos/fuso)
  if (typeof dateString === 'string') {
    dateObj = new Date(dateString);
    if (isNaN(dateObj)) {
      // Tenta forçar formato compatível
      const clean = dateString.replace(' ', 'T');
      dateObj = new Date(clean);
    }
  } else {
    dateObj = new Date(dateString);
  }
  if (isNaN(dateObj)) return dateString;
  return dateObj.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
  });
}