# WeFIND - Aplicativo Mobile

Aplicativo mobile React Native/Expo do sistema **WeFIND** - Plataforma Comunitária e Inteligente de Animais Perdidos e Encontrados.

## 🎨 Identidade Visual e Design System (WeFind)

* **Azul Principal (Confiança e Esperança):** `#2563EB` (Azul Real vibrante, luminoso e acolhedor).
* **Laranja Ações:** `#F28213` (Botões secundários e destaques).
* **Dourado:** `#FEA937` (Pins de mapa, estrelas e recompensas).
* **Neutros:** Fundo `#F8FAFB`, Superfície `#FFFFFF`, Destaques `#EFF6FF` e Bordas `#DBEAFE`.
* **Centralização de Tokens:** `src/constants/theme.js`.

---

## 📱 Funcionalidades

✅ **Identidade e Apresentação Humana**
- Nova identidade visual completa **WeFIND** com logotipo integrado (cão, gato, ave sobre o pin de localização).
- Tela inicial de apresentação (`SobreScreen.jsx`) com abordagem humanizada, espaçamento generoso e sem poluição visual.
- Telas de Login e Cadastro acolhedoras ("Bem-vindo de volta" e "Criar sua conta").

✅ **Autenticação, Notificações e WhatsApp**
- Registro e login direto e simplificado com nome, email, WhatsApp e senha (sem exigência de localização no cadastro).
- **Verificação em 2 etapas por WhatsApp:** Envio do código de 6 dígitos via Evolution API / Supabase Functions com opção de reenvio com timer de recarga e edição rápida de dados.
- **Notificações e Alertas por WhatsApp:** Caixa de consentimento no cadastro (`whatsapp_notifications_enabled`), controle de preferências na tela de configurações (`ConfigScreen.jsx`), botão de disparo de teste instantâneo e alertas em tempo real para os tutores sobre **novas informações de pets** via Evolution API.
- Ao entrar, o feed exibe automaticamente publicações de **Todo o Brasil**, com opção de filtrar por estado, cidade ou mapa no cabeçalho.
- Rolagem inteligente e fluida com `KeyboardAwareScrollView` prevenindo sobreposição do teclado virtual nos formulários.
- Perfis de usuário com foto de avatar e edição de localidade opcional.
- Confirmação de email e recuperação de senha.

✅ **Pets Perdidos e Pets Reencontrados**
- Cadastro de pets em etapas intuitivas com integração de mapa e endereço.
- Seleção completa de espécie, sexo/gênero (Macho/Fêmea), raça, porte, cor, idade e coleira.
- Adição de até 6 fotos com enquadramento/corte nativo e botão "✂️ Ajustar" por miniatura para reenquadrar antes de publicar.
- Carrossel interativo de fotos nos cards do feed (`HomeScreen`) com pontos de paginação e contador de fotos (`1/3`).
- Carrossel de fotos de alta resolução nos detalhes do pet (`ItemDetailScreen`) com navegação paginada e modal de ampliação em tela cheia.
- **Placar Comunitário WeFIND:** Hero Card na tela inicial com contador dinâmico de pets reencontrados hoje, total acumulado desde o início e avatares sobrepostos dos reencontros mais recentes.
- **Histórias de Reencontro em Destaque:** Carrossel de relatos enviados por tutores com foto, avaliação por estrelas, depoimentos e moderação/exclusão pelo administrador.
- **Tela Dedicada de Pets Reencontrados (`RecoveredPetsScreen.jsx`):** Mural de animais que voltaram para casa com cálculo do tempo até o reencontro (ex: "Reencontrado após 1d 4h"), busca e filtros por espécie.
- **Seção "Como Funciona" Interativa:** Atalhos diretos para cadastro de publicação, mapa interativo e mural de reencontros.
- **Compartilhamento de Informações e Comentários com Mapa Interativo:** Modal de novas informações com seleção de localização por GPS/Mapa interativo em tela cheia, geocodificação reversa de endereço, pré-visualização de foto, contatos opcionais e envio automático de notificação no WhatsApp do tutor com link traçado do Google Maps.
- Filtros rápidos por status, espécie, sexo e localização.
- Seletor de localização no cabeçalho com botão destacado e ícone de edição interativo.
- Geocodificação reversa com edição completa de endereço (rua, número da casa, bairro, cidade, estado).
- Publicação em nome de terceiros (amigo, parente, vizinho, ONG) com campos dedicados para nome e telefone direto do tutor/responsável.
- Recompensas opcionais e gamificação.

✅ **Modo Público e Mapa Interativo para Visitantes**
- **Exploração Livre do Mapa:** Visitantes não autenticados podem navegar pelo mapa, consultar cards de pets, ver detalhes e ler comentários livremente.
- **Mensagens Diretas sem Bloqueios:** Chat direto e instantâneo com o autor da publicação (sem burocracia de aprovação prévia de reivindicação).
- Visualização dos pets com fotos e moldura colorida indicando o status (Verde para Encontrado / Laranja para Perdido).
- Busca de localidades via OpenStreetMap e catálogo nacional.
- Centralização rápida na localização atual do usuário.
- Cards e balões informativos interativos para abrir os detalhes do pet.
- Barra inferior com Safe Insets prevenindo sobreposição de botões de navegação do sistema Android.

---

## 🚀 Setup e Execução

### 1. **Instalar Dependências**
```bash
npm install
```

### 2. **Configurar Variáveis de Ambiente**
Copie `.env.example` para `.env`:
```bash
cp .env.example .env
```

Edite `.env` e adicione suas credenciais Supabase:
```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
```

### 3. **Iniciar o Servidor Expo**
```bash
npm start
```

### 4. **Rodar no Dispositivo Mobile**
- Abra o aplicativo **Expo Go** no Android ou iOS.
- Escaneie o QR Code exibido no terminal.

### 5. **Rodar no Navegador (Web)**
```bash
npm start
# Pressione 'w' no terminal para abrir no navegador
```

---

## 📁 Estrutura do Projeto

```
mobile/
├── assets/                   # Ícones e splash do app
├── src/
│   ├── assets/               # Logos do WeFind em alta definição
│   ├── components/           # Componentes reutilizáveis (Button, Card, Input, Modais)
│   ├── constants/            # Design system (theme.js)
│   ├── contexts/             # Context API (AuthContext)
│   ├── lib/                  # Configurações (supabase, br-locations)
│   ├── navigation/           # Navegação do App (Stacks e Bottom Tabs)
│   ├── screens/              # Telas do aplicativo
│   └── services/             # Serviços e APIs (Supabase, Auth, Items, IA)
```