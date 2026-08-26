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
- Nova identidade visual completa **WeFIND** com foco universal em **Animais** (cães, gatos, equinos, bovinos, aves e outros).
- Tela de apresentação (`SobreScreen.jsx`) com abordagem humanizada, espaçamento generoso e nova seção **"Como Funciona o WeFIND"** com mockups visuais interativos (Cadastro Inteligente, Radar GPS e Chat de Conexão).
- **Placar de Impacto Real:** Cálculo em tempo real dos reencontros do dia atual (`startOfToday`) e total acumulado diretamente do banco de dados Supabase.
- Tela de **Finais Felizes & Impacto** otimizada para usuários logados, exibindo diretamente o mural de animais reencontrados e histórias da comunidade.
- Atalhos diretos para acessar **"Sobre o WeFIND"** no menu do cabeçalho da Home, tela de Perfil e Configurações.
- Telas de Login e Cadastro acolhedoras ("Bem-vindo de volta" e "Criar sua conta").

✅ **Autenticação, Notificações e WhatsApp**
- Registro e login direto e simplificado com nome, email, WhatsApp e senha.
- **Verificação em 2 etapas por WhatsApp:** Envio do código de 6 dígitos via Evolution API / Supabase Functions com opção de reenvio com timer de recarga e edição rápida de dados.
- **Notificações de Busca e Feed Inteligente:** Lembretes automáticos a cada 2 dias perguntando se o animal foi encontrado; respostas "Ainda não" impulsionam automaticamente a publicação para o topo do feed (`created_at`).
- **Notificações e Alertas por WhatsApp:** Caixa de consentimento no cadastro (`whatsapp_notifications_enabled`), controle de preferências na tela de configurações (`ConfigScreen.jsx`), botão de disparo de teste instantâneo e alertas em tempo real para os tutores sobre **novas informações de animais** via Evolution API.
- Ao entrar, o feed exibe automaticamente publicações de **Todo o Brasil**, com opção de filtrar por estado, cidade, espécie ou mapa no cabeçalho.
- Cabeçalho dinâmico da tela de feed: centralizado no modo visitante ("Explorar") e alinhado à esquerda com avatar/notificações quando autenticado ("Início").
- Perfis de usuário com foto de avatar, fallback elegante com inicial do nome e edição de localidade opcional.

✅ **Animais Perdidos, Encontrados e Adoção Responsável**
- **Nomenclatura Universal de Animais:** Plataforma expandida para todo tipo de animal (cães, gatos, bovinos, cavalos, aves e outros).
- **Custódia de Animais Encontrados:** Opção clara para indicar se o animal foi **"Apenas visto na rua"** (sem recolhimento) ou se **"Está comigo (Lar Temporário)"**.
- **Sistema de Adoção Responsável e Janela de Busca:**
  - Animais resgatados acolhidos contam com janela obrigatória de 7 dias de busca pelo tutor original antes da liberação oficial para adoção.
  - Suporte a **Adoção Direta** imediata para animais de abrigo ou ninhadas sem dono prévio.
  - Filtro dedicado **"Para Adoção"** no topo do feed com contadores e badges coloridos.
- **Design Minimalista de Atributos com Emojis:**
  - Espécie, raça, sexo, idade, porte e cor organizados em badges minimalistas diretamente abaixo da foto do animal (`🐾`, `🏷️`, `⚧`, `🎂`, `📏`, `🎨`).
- **Cartazes de Compartilhamento Dinâmicos (`ShareCardFlyer.jsx`):**
  - Geração de flyer em imagem de alta definição com cores e temas inteligentes (Vermelho para Perdido, Verde para Encontrado, Rosa/Magenta `#DB2777` para Adoção).
  - Badges de características com emojis e chamada de compartilhamento personalizada.
- **Card de Localização em Largura Total com Data Integrada:**
  - Indicação em linha `"Data em que perdi: DD/MM/AAAA"` ou `"Data em que encontrei: DD/MM/AAAA"`.
- **Avatar e Foto do Autor em "Publicado por" e Avistamentos:**
  - Exibição da foto atualizada do perfil ou avatar circular colorido com a letra inicial do nome do usuário.
- **Padronização do Botão de Retorno:**
  - Botão voltar com moldura circular translúcida e ícone `chevron-left` padronizado na tela de Detalhes do Animal e em toda a pilha de navegação.
- Adição de até 6 fotos com enquadramento/corte nativo e botão "✂️ Ajustar" por miniatura.
- Carrossel interativo de fotos nos cards do feed (`HomeScreen`) e modal em tela cheia nos detalhes (`ItemDetailScreen`).
- **Placar Comunitário WeFIND:** Hero Card com contador dinâmico de animais reencontrados hoje, total acumulado desde o início e avatares sobrepostos.
- **Histórias de Reencontro em Destaque:** Carrossel de relatos enviados por tutores com foto, avaliação por estrelas, depoimentos e moderação/exclusão pelo administrador.
- **Tela Dedicada de Animais Reencontrados (`RecoveredPetsScreen.jsx`):** Mural de animais que voltaram para casa com cálculo do tempo até o reencontro, busca e filtros por espécie.
- Recompensas opcionais e gamificação.

✅ **Modo Público e Mapa Interativo para Visitantes**
- **Barra de Pesquisa de Animais no Mapa:** Busca em tempo real por nome, raça, espécie ou cidade diretamente no topo do mapa, com filtragem instantânea dos marcadores e recentralização automática.
- **Exploração Livre do Mapa:** Visitantes não autenticados podem navegar pelo mapa, consultar cards de animais, ver detalhes e ler comentários livremente com visualização limpa e moderna.
- **Mensagens Diretas sem Bloqueios:** Chat direto e instantâneo com o autor da publicação.
- **Identificação Visual por Cores:**
  - 🟠 **Laranja (`#F97316`):** Animal Perdido
  - 🟢 **Verde (`#16A34A`):** Animal Encontrado
  - 💖 **Rosa (`#DB2777`):** Animal Disponível para Adoção
- Centralização rápida na localização atual do usuário via GPS.
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