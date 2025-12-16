# 🔍 Recover - Sistema de Achados e Perdidos

Plataforma web para registro, busca e recuperação de itens perdidos/achados, com integração de IA para análise de imagens e sistema de chat entre usuários.

---

## 📋 Funcionalidades do Sistema

### **1. AUTENTICAÇÃO E USUÁRIOS**
- ✅ Cadastro de usuários com Supabase (email e senha)
- ✅ Login com validação de credenciais
- ✅ Logout com limpeza de sessão
- ✅ Sistema de autenticação protegida (RequireAuth)
- ✅ Sistema de permissões (Admin vs Usuário comum)
- ✅ Perfil de usuário com informações pessoais

### **2. PERFIL DO USUÁRIO**
- ✅ Visualização de perfil com foto de avatar (inicial do email)
- ✅ Edição de perfil
- ✅ Integração com redes sociais:
  - Instagram
  - Twitter/X
  - Facebook
  - LinkedIn
  - WhatsApp
  - Telefone
- ✅ Visualização e links clicáveis para redes sociais do usuário

### **3. PUBLICAÇÃO DE ITENS PERDIDOS/ACHADOS**
- ✅ Registro de itens com 6 tipos diferentes:
  - **Animal** 🐾 (raça, cor, características)
  - **Documento** 📄 (tipo, nome do proprietário, número)
  - **Objeto** 📦 (marca, modelo, cor)
  - **Eletrônico** 📱 (marca, modelo, cor, número de série)
  - **Joia/Acessório** 💍 (material, cor, marcas distintivas)
  - **Roupa** 👕 (tamanho, cor, marca)
- ✅ Campos dinâmicos baseados no tipo de item
- ✅ Upload de múltiplas fotos do item
- ✅ Análise de imagem com IA (Google Gemini Vision):
  - Preenchimento automático de campos
  - Sugestão de categoria
  - Descrição gerada automaticamente
- ✅ Localização do item:
  - Endereço manual
  - Data de perda/encontro
  - Latitude e longitude
- ✅ Status do item (perdido/encontrado)
- ✅ Categoria personalizável
- ✅ Edição de itens publicados
- ✅ Exclusão de itens

### **4. VISUALIZAÇÃO DE ITENS (HOME)**
- ✅ Grade responsiva com 1 a 6 colunas dependendo do tamanho da tela
- ✅ Cards com foto principal do item
- ✅ Informações resumidas (título, descrição, categoria, status)
- ✅ Expansão "Ver mais" para descrições longas
- ✅ Modal de detalhes ao clicar no item
- ✅ Botão de compartilhamento em redes sociais (WhatsApp, Instagram, Facebook)
- ✅ Botão flutuante (FAB) para registrar novos itens
- ✅ Tema escuro (dark mode) ativo por padrão

### **5. BUSCA E FILTROS**
- ✅ Busca por texto (título, descrição, endereço)
- ✅ Filtro por status (todos/perdido/achado)
- ✅ Filtro por categoria
- ✅ Filtro "Meus Itens" (mostrar apenas itens próprios)
- ✅ Filtros combinados (busca + status + categoria)

### **6. PAINEL DO USUÁRIO (DASHBOARD)**
- ✅ Contador de itens publicados
- ✅ Contador de mensagens recebidas
- ✅ Lista dos 6 itens mais recentes do usuário
- ✅ Botão para marcar item como "resolvido/devolvido"
- ✅ Visualização do avatar do usuário

### **7. SISTEMA DE CHAT/MENSAGENS**
- ✅ Envio de mensagens entre usuários
- ✅ Caixa de entrada (inbox) com todas as mensagens recebidas
- ✅ Sistema de mensagens não lidas
- ✅ Contador de mensagens não lidas na navegação
- ✅ Marcação automática de mensagens como lidas ao visualizar
- ✅ Sistema de resposta a mensagens (reply)
- ✅ Mensagens vinculadas a itens específicos
- ✅ Contato direto com proprietário do item
- ✅ Nome do remetente exibido nas mensagens

### **8. NOTIFICAÇÕES**
- ✅ Sino de notificações na barra de navegação
- ✅ Contador visual de notificações pendentes
- ✅ Notificações para itens com matches (mensagens recebidas sobre itens)
- ✅ Pergunta automática: "Este item foi devolvido/resolvido?"
- ✅ Ações rápidas (Sim/Não/Dispensar)
- ✅ Atualização automática a cada 30 segundos
- ✅ Sincronização com mensagens não lidas

### **9. COMPARTILHAMENTO SOCIAL**
- ✅ Botão de compartilhamento em cada item
- ✅ Compartilhamento via:
  - WhatsApp (com link direto)
  - Instagram (cópia de link)
  - Facebook (cópia de link)
- ✅ Menu dropdown horizontal
- ✅ Ícone de compartilhamento de 3 pontas (padrão mobile)
- ✅ Posicionamento sobre a foto do item

### **10. INTERFACE VISUAL**
- ✅ Tema escuro (dark mode) com tons de cinza
- ✅ Paleta de cores consistente:
  - Primária: azul
  - Secundária: roxo
  - Acento: amarelo/dourado
- ✅ Design responsivo (mobile, tablet, desktop)
- ✅ Animações e transições suaves
- ✅ Cards com altura uniforme
- ✅ Botões com estados hover e active
- ✅ Ícones SVG customizados
- ✅ Gradientes e sombras
- ✅ Menu mobile retrátil

### **11. PAINEL ADMINISTRATIVO**
- ✅ Acesso restrito para administradores
- ✅ Estrutura para gerenciamento de:
  - Usuários
  - Itens
  - Denúncias
  - Estatísticas

### **12. INTEGRAÇÃO COM SUPABASE**
- ✅ Autenticação via Supabase Auth
- ✅ Banco de dados PostgreSQL
- ✅ Storage para fotos dos itens
- ✅ Queries otimizadas
- ✅ Relacionamentos entre tabelas (users, publications, messages, photos)
- ✅ APIs REST nativas do Supabase
- ✅ Real-time subscriptions

### **13. RECURSOS ADICIONAIS**
- ✅ Sistema de estatísticas
- ✅ Histórico de itens publicados
- ✅ Timestamps (data de criação, atualização)
- ✅ Campo de resolução de item (resolved)
- ✅ Suporte a múltiplas fotos por item
- ✅ Validação de formulários
- ✅ Mensagens de erro e sucesso
- ✅ Loading states em operações assíncronas
- ✅ Confirmações antes de ações críticas (deletar, marcar como resolvido)

---

## 🛠️ Tecnologias Utilizadas

### **Frontend**
- React 18
- React Router v6
- Tailwind CSS
- Vite

### **Backend**
- Supabase (Backend as a Service)
- PostgreSQL (via Supabase)
- Supabase Auth
- Supabase Storage
- Supabase Edge Functions (se necessário)

### **IA & APIs**
- Google Gemini Vision API (pode ser integrado via Edge Functions)

---

## 🚀 Como Executar o Projeto

### **Pré-requisitos**
- Node.js 18+
- Conta Supabase
- (Opcional) Chave API do Google Gemini para análise de imagens

### **Configuração do Supabase**
1. Crie um projeto no [Supabase](https://supabase.com)
2. Configure as tabelas necessárias (users, items, messages, etc.)
3. Configure o Storage para upload de imagens
4. Copie a URL e a chave anônima do projeto

### **Frontend**
```bash
cd frontend
npm install

# Configure as variáveis de ambiente (.env)
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_aqui

npm run dev
```

### **Variáveis de Ambiente**
Configure no arquivo `.env` do frontend:
- `VITE_SUPABASE_URL` - URL do projeto Supabase
- `VITE_SUPABASE_ANON_KEY` - Chave anônima do Supabase
- `VITE_GEMINI_API_KEY` - (Opcional) Chave da API Gemini

---

## 📁 Estrutura do Projeto

```
recover/
├── frontend/               # Aplicação React
│   ├── src/
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── contexts/      # Context API (Auth, Theme)
│   │   ├── hooks/         # Custom hooks
│   │   └── services/      # Integração com Supabase
│   └── public/
├── app/                   # Configuração Supabase
│   └── supabase_client.py # Cliente Supabase (apenas referência)
└── scripts/              # Scripts SQL e migrations
```

---

## 📝 Licença

Este projeto é parte de um Trabalho de Conclusão de Curso (TCC).
