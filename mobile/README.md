# RECOVER - Aplicativo Mobile

Aplicativo mobile React Native/Expo do sistema RECOVER - Plataforma de Achados e Perdidos com Gamificação e Recompensas.

## 📱 Funcionalidades

✅ **Autenticação**
- Registro e login com email/senha via Supabase
- Perfis de usuário
- Confirmação de email

✅ **Itens Perdidos/Encontrados**
- Cadastro de itens em 4 etapas
- Upload de múltiplas fotos
- Filtros por status, categoria e localização
- Detalhes expandíveis de itens
- Recompensas opcionais

✅ **Chat**
- Mensagens em tempo real entre usuários
- Notificações de novas mensagens
- Histórico de conversas

✅ **Avistamentos**
- Reportar avistamentos de itens
- Fotos de avistamentos
- Notificações automáticas

✅ **Recompensas**
- Sistema de recompensas
- Reivindicações e aprovação
- Gamificação com pontos e níveis

✅ **Perfil**
- Editar informações pessoais
- Redes sociais
- Histórico de itens
- Pontos e nível

📋 **Em Desenvolvimento**
- Implementação completa de Chat com Supabase Realtime
- Mapa com localização dos itens
- Notificações push
- Câmera e galeria
- Painel Admin

## 🚀 Setup

### 1. **Clonar o Repositório**
```bash
git clone https://github.com/luish/recover-APP.git
cd recover-APP/tcc_recover/recover/mobile
```

### 2. **Verificar Node.js e npm**
```bash
node -v
npm -v
```

Se os dois comandos retornarem uma versão, o Node.js e o npm estão instalados.

> **Windows / PowerShell:** se aparecer o erro `npm.ps1 não pode ser carregado porque a execução de scripts foi desabilitada neste sistema`, o npm está instalado, mas o PowerShell bloqueou a execução do script.
>
> Use uma destas opções:
>
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```
>
> Feche e abra o PowerShell novamente antes de rodar `npm install`.
>
> Ou, sem alterar a política de execução:
>
> ```powershell
> npm.cmd install
> ```

### 3. **Instalar Dependências**
```bash
npm install
```

### 4. **Configurar Variáveis de Ambiente**

Copie `.env.example` para `.env`:
```bash
cp .env.example .env
```

Edite `.env` e adicione suas credenciais Supabase:
```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
```

### 5. **Iniciar o Servidor Expo**
```bash
npm start
```

### 6. **Rodar no Dispositivo Mobile**

**Android (com Expo Go):**
- Instale Expo Go na Google Play Store
- Abra Expo Go
- Escaneie o QR code exibido no terminal com a câmera
- Ou em `Recent`, clique em `exp://seu-ip:8083`

**iOS (com Expo Go):**
- Instale Expo Go na App Store
- Abra Expo Go
- Escaneie o QR code com a câmera do iOS
- Toque na notificação para abrir

### 7. **Rodar no Navegador (Web)**
```bash
npm start
# Pressione 'w' no terminal para abrir web
```

## 📁 Estrutura do Projeto

```
mobile/
├── src/
│   ├── components/           # Componentes reutilizáveis
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   └── Card.jsx
│   ├── contexts/             # Context API
│   │   └── AuthContext.jsx
│   ├── hooks/                # Custom hooks
│   ├── lib/                  # Configurações
│   │   └── supabase.js
│   ├── navigation/           # Navegação
│   │   └── index.jsx
│   ├── screens/              # Telas do app
│   │   ├── WelcomeScreen.jsx
│   │   ├── LoginScreen.jsx
│   │   ├── RegisterScreen.jsx
│   │   ├── HomeScreen.jsx
│   │   ├── ProfileScreen.jsx
│   │   ├── ChatScreen.jsx
│   │   ├── RegisterItemScreen.jsx
│   │   ├── SearchScreen.jsx
│   │   ├── MapScreen.jsx
│   │   ├── DashboardScreen.jsx
│   │   ├── AdminScreen.jsx
│   │   └── EditProfileScreen.jsx
│   └── services/             # Serviços/APIs
│       ├── supabaseAuth.js
│       ├── user.js
│       ├── items.js
│       ├── sightings.js
│       ├── rewards.js
│       └── statistics.js
├── App.js                    # Componente raiz
├── app.json                  # Configuração Expo
├── babel.config.js           # Configuração Babel
├── .env                      # Variáveis de ambiente
├── .env.example              # Template de variáveis
└── package.json              # Dependências

```

## 🔐 Segurança

- ✅ Supabase Auth com email/senha
- ✅ Row Level Security (RLS) em todas as tabelas
- ✅ Variáveis de ambiente para credenciais
- ✅ Sem dados sensíveis no código

## 📦 Dependências Principais

- **React Native**: Framework mobile
- **Expo**: Tooling e SDK
- **React Navigation**: Navegação
- **Supabase**: Backend e autenticação
- **Axios**: HTTP client (opcional)

Veja `package.json` para lista completa.

## 🛠️ Desenvolvimento

### Scripts Disponíveis

```bash
# Iniciar servidor Expo
npm start

# Abrir no Android
npm run android

# Abrir no iOS
npm run ios

# Abrir na web
npm run web
```

### Hot Reload

O Expo suporta **Fast Refresh** por padrão. Qualquer mudança em um arquivo é recarregada automaticamente no app sem rebuildar.

### Debug

- Pressione `j` no terminal para abrir o debugger
- Pressione `m` para acessar o menu do Expo
- Pressione `Ctrl+C` para parar o servidor

## 🚀 Build e Deploy

### Android APK
```bash
eas build --platform android --local
```

### iOS IPA
```bash
eas build --platform ios --local
```

### Publishing
```bash
eas submit --platform android  # Google Play Store
eas submit --platform ios      # App Store
```

## 📝 Próximas Etapas

1. **Chat com Realtime**
   - Implementar Supabase Realtime em ChatScreen
   - Message status (enviado, entregue, lido)

2. **Câmera e Galeria**
   - Integrar expo-image-picker
   - Câmera ao vivo com expo-camera
   - Compressão de imagem

3. **Geolocalização e Mapa**
   - expo-location para GPS
   - react-native-maps ou expo-maps
   - Visualizar itens no mapa

4. **Notificações Push**
   - expo-notifications
   - Firebase Cloud Messaging (Android)
   - APNs (iOS)

5. **Painel Admin**
   - Gerenciamento de usuários
   - Moderação de itens
   - Estatísticas avançadas

6. **Testes**
   - Testes unitários (Jest)
   - Testes de integração (Detox)
   - CI/CD com GitHub Actions

## 🐛 Troubleshooting

### Erro: "Unable to resolve module"
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
npm start -- --clear
```

### Erro: `npm.ps1 não pode ser carregado`
Esse erro acontece no **Windows PowerShell** quando a política de execução de scripts está bloqueando o `npm.ps1`.

Se `node -v` e `npm -v` mostram uma versão, então o npm está instalado. Para corrigir:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Feche e abra o PowerShell novamente e rode:

```powershell
npm install
```

Se preferir não mudar a política de execução, use:

```powershell
npm.cmd install
```

### Erro: "Port already in use"
O Expo automaticamente oferece uma porta alternativa. Ou mate o processo anterior:
```bash
lsof -ti:8081 | xargs kill -9
```

### Erro de autenticação
Verifique que `.env` está configurado com as credenciais Supabase corretas:
```bash
cat .env
```

## 📞 Suporte

Para reportar bugs ou sugerir melhorias, abra uma issue no GitHub.

## 📄 Licença

MIT - Veja LICENSE para detalhes.

## 🙏 Agradecimentos

- [Supabase](https://supabase.io) - Backend
- [Expo](https://expo.io) - Ferramentas React Native
- [React Navigation](https://reactnavigation.org) - Navegação
