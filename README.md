# WeFIND - Aplicativo Mobile

Aplicativo mobile React Native/Expo do sistema **WeFIND** - Plataforma Comunitária e Inteligente de Animais Perdidos e Encontrados.

## 🎨 Identidade Visual e Design System (WeFind)

* **Azul Principal (Confiança e Esperança):** `#2563EB` (Azul Real vibrante, luminoso e acolhedor).
* **Laranja Ações:** `#F28213` (Botões secundários e destaques).
* **Dourado:** `#FEA937` (Pins de mapa, estrelas e recompensas).
* **Neutros:** Fundo `#F8FAFB`, Superfície `#FFFFFF`, Destaques `#EFF6FF` e Bordas `#DBEAFE`.
* **Centralização de Tokens:** `src/constants/theme.js` e `src/contexts/ThemeContext.jsx`.

---

## 🌙 Suporte a Tema Escuro e Aparência (Dark Mode)

* **Provedor Global de Temas (`ThemeContext.jsx`):** Suporte a modo Claro (`light`), modo Escuro (`dark`) e modo Automático/Sistema (`system`).
* **Cards Suaves no Modo Claro:** Cores refinadas para off-white suave (`#F8FAFC`) com bordas delicadas (`#E2E8F0`), evitando o branco estático ofuscante.
* **Cards Imersivos no Modo Escuro:** Paleta em tom ardósia (`#161F30`), bordas suaves (`#243248`) e blocos internos em `#0F172A`.
* **Controle de Aparência nas Configurações:** Seção "Aparência" na tela de Configurações com switch rápido e modal de seleção detalhada.
* **Redefinição Automática para Modo Claro no Logout:** Ao desconectar a conta, o sistema automaticamente redefine as preferências e o estado para o modo claro, garantindo visualização padrão a visitantes.
* **Telas Totalmente Adaptadas ao Tema Escuro:**
  - Tela Inicial (`HomeScreen.jsx`), busca, barra de filtros rápidos, painel avançado e banner de raio de 60 km.
  - Tela de Detalhes do Animal (`ItemDetailScreen.jsx`).
  - Tela de Mensagens e Chat (`InboxScreen.jsx` e `ChatScreen.jsx`).
  - Tela de Minhas Publicações (`MeusAnunciosScreen.jsx`).
  - Fluxo completo de Cadastro/Edição de Animais (`RegisterItemScreen.jsx`).
  - Modal "Compartilhar Cartaz" (`ShareFlyerModal.jsx`).
  - Navegação de Abas Inferiores e Cabeçalhos de Navegação.

---

## 📱 Funcionalidades

✅ **Identidade e Apresentação Humana**
- Nova identidade visual completa **WeFIND** com foco universal em **Animais** (cães, gatos, equinos, bovinos, aves e outros).
- Tela de apresentação institucional (**"Sobre o WeFIND"** - `SobreScreen.jsx`) com abordagem humanizada, espaçamento generoso e seção **"Como Funciona o WeFIND"** com mockups visuais interativos (Cadastro Inteligente, Radar GPS e Chat de Conexão).
- **Mural de Reencontros (`MuralReencontrosScreen.jsx`):** Tela dedicada e de carregamento instantâneo com placar comunitário em tempo real dos reencontros do dia atual (`startOfToday`), total acumulado desde o início e histórias/depoimentos enviados por tutores.
- **Paleta de Cores Padronizada:** 100% alinhada à identidade visual WeFIND (Azul Real `#2563EB`, Verde Sucesso `#10B981`/`#16A34A`, Dourado `#FEA937` e Neutros/Ardósia), sem cores roxas.
- Atalhos diretos para acessar **"Mural de Reencontros"** e **"Sobre o WeFIND"** no menu do perfil e configurações.
- Telas de Login e Cadastro acolhedoras ("Bem-vindo de volta" e "Criar sua conta").

✅ **Autenticação, Notificações e Segurança por WhatsApp**
- Registro e login direto e simplificado com nome, email, WhatsApp e senha.
- **Verificação em 2 etapas por WhatsApp:** Envio do código de 6 dígitos via Evolution API / Supabase Functions com opção de reenvio com timer de recarga e edição rápida de dados.
- **Redefinição de Senha e Alteração de WhatsApp com Código:**
  - Redefinição de senha diretamente pelo perfil através do fluxo oficial de WhatsApp (`EsqueciSenhaScreen.jsx`).
  - Validação obrigatória por código de 6 dígitos no WhatsApp ao atualizar o número de telefone no perfil.
- **Notificações de Busca e Feed Inteligente:** Lembretes automáticos a cada 2 dias perguntando se o animal foi encontrado; respostas "Ainda não" impulsionam automaticamente a publicação para o topo do feed (`created_at`).
- **Notificações e Alertas por WhatsApp:** Caixa de consentimento no cadastro (`whatsapp_notifications_enabled`), controle de preferências na tela de configurações (`ConfigScreen.jsx`), botão de disparo de teste instantâneo e alertas em tempo real para os tutores sobre **novas informações de animais** via Evolution API.
- **Perfil do Usuário Humanizado e Sem Blocos Artificiais:**
  - Identidade visual limpa, botão em linha para edição de dados e agrupamentos nativos de menu (Comunidade, Conta & Preferências).

✅ **Localização Inteligente, Endereço Completo e Raio de Busca Personalizável**
- **Sincronização Bidirecional de Localização:**
  - Definição pelo cabeçalho da Tela Inicial ou pela tela de Editar Perfil com persistência local (`AsyncStorage`) e no Supabase (`profiles`).
- **Endereço Completo e Detalhado:**
  - Geolocalização reversa automática capturando Rua, Número, Bairro, Cidade, Estado e CEP com suporte a edição manual.
  - Cabeçalho compacto (`Rua, Cidade, UF • <raio> km`) que preserva o layout sem empurrar a foto de perfil.
- **Raio de Busca Personalizável (15 km a 250 km):**
  - Seletores interativos de distância rápida (**15 km**, **30 km**, **60 km**, **100 km**, **150 km**, **250 km**).
  - Visualização em tempo real do **círculo de alcance** no mapa (`MapLocationPicker.native.jsx`).
- Ao entrar, o feed filtra automaticamente as publicações pelo ponto GPS marcado e pelo raio selecionado, com opção de resetar para **Todo o Brasil**.
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
- **Cartazes de Compartilhamento Dinâmicos ("Compartilhar Cartaz" - `ShareCardFlyer.jsx` & `ShareFlyerModal.jsx`):**
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
- **Localização de Visitante Temporária ("Todo o Brasil" padrão):**
  - Usuários não autenticados sempre iniciam com "Todo o Brasil" (sem restrição geográfica).
  - Qualquer seleção de cidade/ponto no mapa é aplicada apenas temporariamente na sessão atual.
  - Ao trocar de aba ou navegar para outra tela, a localização volta automaticamente para "Todo o Brasil".
  - Para usuários autenticados, a localização é persistida permanentemente no perfil e no dispositivo.

---

✅ **Feed Inteligente — Performance, Ordenação e Consistência**
- **Carregamento Instantâneo com Cache (Stale-While-Revalidate):**
  - Dados do cache local aparecem imediatamente ao abrir o app; o servidor atualiza silenciosamente em background.
  - O cache é pré-validado para remover itens expirados ou resolvidos antes de renderizar.
- **Eliminação do Flickering/Pulo de Publicações:**
  - `filteredItems` convertido para `useMemo` determinístico — produz exatamente **um render atômico** por mudança de dados, sem competição entre cache e servidor.
  - Removidos todos os `useEffect` redundantes e chamadas paralelas a `applyFilters` que causavam a troca visual de publicações.
- **Ordenação Estrita por Proximidade (Crescente):**
  - Animais mais próximos do usuário sempre no topo (ex: 350 m → 1.2 km → 4.5 km → 18 km).
  - Desempate por data mais recente (`created_at` decrescente).
  - Qualquer mudança de localização ou raio recalcula a lista imediatamente.
- **Eliminação de Publicações Fantasmas:**
  - Função `shouldHideItem` corrigida para calcular expiração a partir de `created_at` (janela de 7 dias), mesmo sem campo `expires_at` explícito.
  - Queries do Supabase filtram `resolved: false` por padrão em todas as buscas públicas.
  - Cache e estado local são sanitizados instantaneamente ao excluir ou resolver um anúncio.
- **Query Única Otimizada com Joins:**
  - `listItemsWithPhotosAndOwner` busca itens, perfis, fotos e recompensas em **1 único roundtrip de rede**.
- **Renderização Nativa e Virtualização:**
  - `ItemCard` com `React.memo`, FlatList com `windowSize`, `removeClippedSubviews` e decodificação multithread de imagens.

---

## 🧭 Arquitetura de Avistamentos em Tempo Real & Rastro de Deslocamento (TCC)

O sistema WeFIND implementa uma arquitetura inédita de **"Rede Viva de Avistamentos Comunitários"** (*Sighting Trail & Live Pin Tracking*), desenhada especificamente para solucionar dois desafios fundamentais do resgate animal urbano:

```
                  ┌──────────────────────────────────────────────────────────┐
                  │          NOVO USUÁRIO AVISTA ANIMAL NA RUA               │
                  └─────────────────────────────┬────────────────────────────┘
                                                │
                 ┌──────────────────────────────┴────────────────────────────┐
                 ▼                                                           ▼
       [Opção A: No Mapa Interativo]                             [Opção B: No Cadastro do App]
       • Toca em "Vi o Pet Aqui" no Card                         • Seleciona "Visto na rua (não fiquei)"
       • Dispara captura instantânea de GPS                      • Informa espécie e localização GPS
                 │                                                           │
                 │                                                           ▼
                 │                                       [Motor de Correspondência Geodésica]
                 │                                       • Busca ativa em raio de 5 km (Haversine)
                 │                                       • Validação de espécie e temporalidade
                 │                                                           │
                 │                              ┌────────────────────────────┴──────────────────────────┐
                 │                              ▼                                                       ▼
                 │                    [Sem correspondência]                                  [Encontrado Pet Similar!]
                 │                    • Prossegue com novo cadastro                          • Abre Modal com Fotos & Distância
                 │                              │                                            • "Sim, é este pet!" ────────┐
                 │                              ▼                                                       │                 │
                 │                    [Cria Novo Pin no Mapa]                                           │                 │
                 │                                                                                      │                 │
                 └──────────────────────────────────────┬───────────────────────────────────────────────┘                 │
                                                        ▼                                                                 ▼
                                        [Execução da Atualização Atômica]                                   [Notificação Instantânea]
                                        1. Insere histórico em `item_sightings`                              • Dispara alerta ao tutor
                                        2. Atualiza coordenadas vivas em `items`                             • Alerta voluntários da área
                                        3. Move o marcador GPS no mapa para o ponto atual
                                        4. Atualiza a Rota de Navegação até o animal
```

---

### 1. 🧮 Fundamentação Matemática: Fórmula de Haversine
Para determinar a distância ortodrômica (em linha reta sobre a superfície esférica da Terra) entre a localização atual do usuário e as coordenadas dos animais registrados na base de dados, utilizamos a **Fórmula de Haversine**:

$$\Delta\sigma = 2 \cdot \arcsin\left( \sqrt{ \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1) \cdot \cos(\phi_2) \cdot \sin^2\left(\frac{\Delta\lambda}{2}\right) } \right)$$

$$d = R \cdot \Delta\sigma$$

Onde:
* $\phi_1, \phi_2$: Latitude do ponto 1 e ponto 2 em radianos.
* $\Delta\phi = \phi_2 - \phi_1$: Diferença de latitudes.
* $\Delta\lambda = \lambda_2 - \lambda_1$: Diferença de longitudes.
* $R = 6.371\text{ km}$: Raio médio volumétrico da Terra.
* $d$: Distância geodésica resultante em quilômetros.

No código-fonte, a função está implementada de forma otimizada em `src/services/sightings.js`:
```javascript
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
```

---

### 2. 🛡️ Segurança e Privacidade: Segregação de Custódia (`spotted` vs `with_me`)
Para garantir a integridade física e a privacidade dos membros da comunidade:
1. **Animais Vistos na Rua (`found_custody === 'spotted'` e `status === 'lost'`):**
   - São os **únicos** exibidos publicamente nos pins do mapa.
   - O objetivo é mobilizar a comunidade para o resgate imediato de animais em situação de vulnerabilidade e deslocamento.
2. **Animais Acolhidos em Lar Temporário (`found_custody === 'with_me'`):**
   - O endereço residencial do voluntário **não é plotado no mapa público**.
   - A entrega é realizada de forma segura mediante o fluxo formal de comprovação de tutela e chat autenticado com liberação do ponto de encontro.

---

### 3. 🔍 Detecção Inteligente de Duplicidade no Cadastro (`RegisterItemScreen.jsx`)
Quando um usuário encontra um animal na rua e inicia o cadastro:
1. Ao definir a espécie e selecionar a localização GPS, o sistema invoca silenciosamente `findNearbyPotentialMatches(...)`.
2. Se houver registros de animais perdidos ou vistos na mesma área em um raio de até **5 km**, o modal interativo `NearbyMatchingModal` é exibido.
3. Se o usuário confirmar (*"Sim, é este pet!"*):
   - O sistema cria o registro de avistamento com a nova foto tirada.
   - A localização do pin no mapa do animal existente é movida **automaticamente** para as novas coordenadas.
   - O tutor e voluntários são notificados imediatamente sobre a nova posição do pet.
4. Se o usuário recusar (*"Não, é outro animal"*):
   - O fluxo prossegue e cria uma publicação inédita sem atrito.

---

### 4. 🚗 Rota GPS e Navegação Dinâmica até o Último Avistamento (`MapScreen.native.jsx`)
* **Cálculo de Trajeto OSRM (Open Source Routing Machine):** Rota traçada dinamicamente entre a posição em tempo real do voluntário/tutor e as coordenadas mais recentes do animal.
* **HUD de Navegação Ativa:** Exibição da distância em quilômetros, tempo estimado de chegada e botão para navegação assistida por GPS.

---

### 5. 🛡️ Arquitetura de Privacidade e Segurança do Tutor (Privacy by Design - LGPD)

Um dos pilares acadêmicos e operacionais mais críticos do **WeFIND** é a proteção integral da integridade física, psicológica e patrimonial dos tutores em momentos de vulnerabilidade:

```
                      [ CADASTRO DE ANIMAL PERDIDO ]
                                     │
               ┌─────────────────────┴─────────────────────┐
               ▼                                           ▼
   [ O que o Sistema Utiliza ]                [ O que o Público Visualiza ]
   • Coordenada GPS (Epicentro)               • Apenas Bairro e Cidade
   • Algoritmo de Haversine (Raio de Alerta)  • Ponto de Referência Opcional
   • Disparo para Voluntários Próximos        • NUNCA o número da casa do tutor
```

#### 📌 Princípios Implementados:
1. **Desacoplamento do Endereço Residencial (*Anti-Scam* / Prevenção a Extorsões):**
   - Ao cadastrar que perdeu um animal, o tutor **NÃO** deve e **NÃO** é solicitado a informar o número de sua residência.
   - Isso elimina fraudes comuns onde golpistas usam o endereço da vítima para fingir sequestro/resgate com exigência de transferências bancárias (Pix).
2. **Conceito de Epicentro Geográfico de Busca:**
   - A coordenada registrada funciona como o **centro do círculo de busca**.
   - O algoritmo geoespacial do WeFIND calcula a proximidade e envia notificações automáticas em lote para voluntários e lares temporários situados num raio de **5 km a 10 km** do ponto de desaparecimento.
3. **Diferenciação Contextual de Localização por Tipo de Publicação:**
   - **Animal Perdido (`status === 'lost'`):** O público visualiza apenas o bairro e referências gerais (*ex: "Região do Centro • Proximidades da Praça Tochetto"*).
   - **Animal Visto na Rua (`found_custody === 'spotted'`):** O endereço do logradouro público fica visível (*ex: "Av. Brasil, 450 - Centro"*), permitindo que a comunidade e o tutor tracem rotas de resgate imediatas.
   - **Animal Acolhido (`found_custody === 'with_me'`):** O endereço do lar temporário permanece sob sigilo absoluto; o tutor só obtém contato após passar pela triagem no chat interno com comprovação de posse (características particulares, cicatrizes e validação por fotos).

---

✅ **Segurança — Senhas Fortes e Mensagens Amigáveis**
- **Medidor Visual de Força de Senha (`PasswordStrengthIndicator.jsx`):**
  - Barra de progresso colorida em tempo real com nível: Fraca / Média / Forte / Excelente.
  - Checklist de requisitos com ícones: mínimo 8 caracteres, maiúscula, minúscula e número.
- **Tradução Amigável de Erros de Autenticação (`src/utils/authErrors.js`):**
  - Credenciais incorretas, usuário não encontrado, e-mail não confirmado, conta já existente, senha fraca, rate limit e erros de rede — todos com mensagens claras e humanizadas em português.

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