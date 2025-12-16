# 🚀 Quick Start Guide - RECOVER Mobile App

## ⚡ Começar em 3 Minutos

### 1️⃣ Clonar e Instalar
```bash
cd recover-APP/tcc_recover/recover/mobile
npm install
```

### 2️⃣ Configurar Variáveis
```bash
# Copiar template
cp .env.example .env

# Editar .env com suas credenciais Supabase
# EXPO_PUBLIC_SUPABASE_URL=sua_url
# EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_key
```

### 3️⃣ Rodar o App
```bash
npm start
```

Abra **Expo Go** no seu celular e escaneie o QR code!

---

## 📱 Testando Funcionalidades

### Teste 1: Registro e Login ✅
1. Clique "Cadastrar-se"
2. Preencha nome, email e senha
3. Verifique email de confirmação
4. Faça login

### Teste 2: Visualizar Itens ✅
1. Após login, você está em Home
2. Veja lista de itens perdidos/encontrados
3. Clique "Expandir" para ver detalhes
4. Use filtros (Perdidos, Encontrados, Meus Itens)

### Teste 3: Cadastrar Item ✅
1. Clique na aba "Registrar"
2. Escolha tipo de item (animal, documento, etc)
3. Preencha informações
4. (Opcional) Ofereça recompensa
5. Publicar!

### Teste 4: Editar Perfil ✅
1. Vá para "Perfil"
2. Clique "Editar Perfil"
3. Atualize nome, bio, redes sociais
4. Salve

### Teste 5: Dashboard ✅
1. Em Home, clique menu (≡) → Dashboard
2. Veja estatísticas do sistema

---

## 🔄 Workflow de Desenvolvimento

### Hot Reload (Automático)
```
Edite um arquivo → Salve → App recarrega automaticamente
Sem rebuild necessário! 🎉
```

### Debug Console
```
npm start
Pressione: j → Abre Debug Console
           m → Abre Menu do Expo
           r → Recarrega app
           Ctrl+C → Para servidor
```

### Limpar Cache
```bash
npm start -- --clear
```

---

## 📂 Estrutura de Arquivos Principais

```
src/
├── screens/
│   ├── HomeScreen.jsx          ← Feed de itens
│   ├── ProfileScreen.jsx        ← Perfil do usuário
│   ├── RegisterItemScreen.jsx   ← Cadastro de item (4 etapas)
│   ├── ChatScreen.jsx           ← Chat (placeholder)
│   └── ... (outras telas)
├── services/
│   ├── items.js                 ← CRUD de itens
│   ├── user.js                  ← Dados do usuário
│   ├── rewards.js               ← Sistema de recompensas
│   ├── sightings.js             ← Avistamentos
│   └── messages.js              ← Mensagens/Chat
├── components/
│   ├── Button.jsx               ← Botão reutilizável
│   ├── Input.jsx                ← Input reutilizável
│   └── Card.jsx                 ← Card reutilizável
└── contexts/
    └── AuthContext.jsx          ← Autenticação global
```

---

## 🎨 Customização Rápida

### Trocar Cor Principal
```javascript
// Em qualquer arquivo de estilo:
// Procure: '#4F46E5'
// Substitua por sua cor

// Exemplo:
const primaryColor = '#4F46E5';  // Indigo
// Para azul:
const primaryColor = '#3B82F6';  // Blue
```

### Trocar Fonte
```javascript
// Em src/components/Button.jsx (ou outro):
// Altere: fontWeight: 'bold'
// E: fontSize: 16

// Para uma fonte customizada, instale:
// npm install expo-font react-native-web
```

### Alterar Layout
```javascript
// Mudar ordem das abas em src/navigation/index.jsx
// Remover/adicionar screens em Tab.Navigator
// Fácil de customizar!
```

---

## 🐛 Erros Comuns e Soluções

| Erro | Solução |
|------|---------|
| "Module not found" | `npm install` + `npm start -- --clear` |
| "Auth error" | Cheque .env com credenciais Supabase |
| "Port in use" | `npm start` usa porta alternativa automaticamente |
| "App crashes" | Abra console (j) para ver erro exato |

---

## 📊 Checklist de Setup

- [ ] Clonar repositório
- [ ] `npm install`
- [ ] Copiar `.env.example` para `.env`
- [ ] Adicionar credenciais Supabase em `.env`
- [ ] `npm start`
- [ ] Instalar Expo Go no celular
- [ ] Escanear QR code
- [ ] Testar registro/login
- [ ] Testar visualização de itens

---

## 💡 Dicas Profissionais

### Performance
- FlatList é otimizado para listas grandes ✅
- Imagens são lazy-loaded
- Cache de dados está pronto (AsyncStorage)

### Segurança
- Supabase Auth com email/senha
- RLS (Row Level Security) habilitado
- Variáveis sensíveis em `.env`

### Debugging
```javascript
// Adicione logs para debug:
console.log('[SeuComponent] Debug message:', value);

// Veja no console:
npm start → pressione 'j'
```

---

## 🚀 Próximas Funcionalidades Fáceis

1. **Chat Realtime** (2-3 horas)
   - Arquivo `src/services/messages.js` já existe
   - Integrar Supabase Realtime em ChatScreen

2. **Câmera** (1-2 horas)
   - `expo-image-picker` já instalado
   - Adicionar em RegisterItemScreen

3. **Geolocalização** (1-2 horas)
   - Instalar `expo-location`
   - Usar em RegisterItemScreen

---

## 📞 Suporte

### Documentação Oficial
- [React Native](https://reactnative.dev)
- [Expo](https://docs.expo.dev)
- [React Navigation](https://reactnavigation.org)
- [Supabase](https://supabase.io/docs)

### Comunidade
- [Expo Discord](https://discord.gg/YNsG6MzNQe)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/react-native)

---

## ✨ Pronto para Produção?

Quando estiver pronto para deploy:

### Android
```bash
eas build --platform android
eas submit --platform android
```

### iOS
```bash
eas build --platform ios
eas submit --platform ios
```

---

**Happy Coding! 🎉**

Para mais detalhes, veja `README.md` e `IMPLEMENTATION_GUIDE.md`
