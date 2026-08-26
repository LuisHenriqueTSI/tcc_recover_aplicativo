/**
 * Utilitários para mensagens amigáveis de autenticação e validação de força de senha
 */

export const validatePasswordStrength = (password = '') => {
  const pwd = String(password || '');
  const minLength = pwd.length >= 8;
  const hasUpperCase = /[A-Z]/.test(pwd);
  const hasLowerCase = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

  const criteriaMet = [minLength, hasUpperCase, hasLowerCase, hasNumber].filter(Boolean).length;
  const isValid = minLength && hasUpperCase && hasLowerCase && hasNumber;

  let strengthLabel = 'Fraca';
  let strengthColor = '#EF4444'; // Vermelho
  let strengthPercent = 25;

  if (criteriaMet === 4) {
    if (hasSpecial && pwd.length >= 10) {
      strengthLabel = 'Excelente';
      strengthColor = '#10B981'; // Verde Esmeralda
      strengthPercent = 100;
    } else {
      strengthLabel = 'Forte';
      strengthColor = '#16A34A'; // Verde
      strengthPercent = 85;
    }
  } else if (criteriaMet === 3) {
    strengthLabel = 'Média';
    strengthColor = '#F59E0B'; // Amarelo/Âmbar
    strengthPercent = 60;
  } else if (criteriaMet === 2) {
    strengthLabel = 'Fraca';
    strengthColor = '#F97316'; // Laranja
    strengthPercent = 40;
  }

  const missingRules = [];
  if (!minLength) missingRules.push('No mínimo 8 caracteres');
  if (!hasUpperCase) missingRules.push('Pelo menos 1 letra maiúscula (A-Z)');
  if (!hasLowerCase) missingRules.push('Pelo menos 1 letra minúscula (a-z)');
  if (!hasNumber) missingRules.push('Pelo menos 1 número (0-9)');

  return {
    isValid,
    score: criteriaMet,
    minLength,
    hasUpperCase,
    hasLowerCase,
    hasNumber,
    hasSpecial,
    strengthLabel,
    strengthColor,
    strengthPercent,
    missingRules,
    feedback: missingRules.length > 0 ? missingRules[0] : 'Senha forte e segura!',
  };
};

export const getFriendlyAuthErrorMessage = (error) => {
  if (!error) return 'Ocorreu um imprevisto. Por favor, tente novamente.';
  const msg = typeof error === 'string' ? error : error?.message || '';
  const lower = msg.toLowerCase();

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_credentials') ||
    lower.includes('invalid email or password') ||
    lower.includes('invalid_grant')
  ) {
    return 'E-mail ou senha incorretos. Por favor, confira os dados digitados e tente novamente.';
  }

  if (
    lower.includes('user not found') ||
    lower.includes('user_not_found') ||
    lower.includes('no user found')
  ) {
    return 'Nenhuma conta foi encontrada com este e-mail. Que tal criar uma nova conta?';
  }

  if (
    lower.includes('email not confirmed') ||
    lower.includes('email_not_confirmed') ||
    lower.includes('confirme seu email')
  ) {
    return 'Seu cadastro precisa ser confirmado. Verifique o código de validação enviado no seu WhatsApp.';
  }

  if (
    lower.includes('user already registered') ||
    lower.includes('email already in use') ||
    lower.includes('already registered') ||
    lower.includes('already exists')
  ) {
    return 'Já existe uma conta cadastrada com este e-mail. Você pode entrar diretamente ou redefinir sua senha.';
  }

  if (
    lower.includes('password should be at least') ||
    lower.includes('weak_password') ||
    lower.includes('password is too weak')
  ) {
    return 'Para sua segurança, crie uma senha mais forte com no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas e números.';
  }

  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('over_email_send_rate_limit') ||
    lower.includes('over_request_rate_limit')
  ) {
    return 'Muitas tentativas em pouco tempo. Por favor, aguarde 1 minuto antes de tentar novamente.';
  }

  if (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('timeout')
  ) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão de internet e tente novamente.';
  }

  if (
    lower.includes('código inválido') ||
    lower.includes('invalid code') ||
    lower.includes('token has expired') ||
    lower.includes('código expirado')
  ) {
    return 'O código informado está incorreto ou expirou. Solicite um novo código no seu WhatsApp.';
  }

  return msg || 'Ocorreu um erro ao processar sua solicitação. Tente novamente.';
};
