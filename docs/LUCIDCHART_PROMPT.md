# 🎨 Prompt & Código para Lucidchart (Diagrama de Casos de Uso - WeFIND)

Use os recursos abaixo para gerar o Diagrama de Casos de Uso diretamente no **Lucidchart** (seja usando a IA do Lucidchart ou a ferramenta de importação nativa).

---

## 🤖 1. Prompt para a IA do Lucidchart (Lucid AI)

> Copie todo o texto abaixo e cole no campo de comando da **IA do Lucidchart** (botão *"Generate with AI"* / *"Gerar com IA"*):

```text
Crie um Diagrama de Casos de Uso UML formal e bem estruturado para o aplicativo mobile "WeFIND" (sistema de localização e recuperação de pets perdidos/encontrados).

Organize o diagrama com:
1. Atores Humanos (à esquerda e direita da fronteira):
   - "Visitante" (ator não autenticado)
   - "Usuário Autenticado" (especializa/herda de Visitante)
   - "Administrador" (responsável pela moderação)

2. Atores de Sistemas Externos:
   - "Evolution API (WhatsApp)" (serviço externo de mensageria 2FA e notificações)
   - "Serviço de Mapas e GPS" (serviço externo de geocodificação e rotas)

3. Fronteira do Sistema: "Aplicativo WeFIND" contendo os seguintes casos de uso em elipses:
   - Módulo Autenticação: "Criar Conta", "Verificar Conta por WhatsApp", "Efetuar Login", "Gerenciar Perfil e Notificações"
   - Módulo Pets: "Explorar e Filtrar Pets", "Visualizar Detalhes do Pet", "Publicar Pet Perdido/Encontrado", "Ajustar e Cortar Fotos", "Publicar para Tutor Terceiro", "Gerar e Compartilhar Flyer", "Gerenciar Meus Anúncios"
   - Módulo Interação: "Informar Avistamento", "Selecionar Ponto no Mapa", "Notificar Tutor no WhatsApp", "Conversar via Chat em Tempo Real"
   - Módulo Moderação: "Moderar Publicações", "Analisar Denúncias"

4. Relacionamentos e Associações:
   - Visitante conecta em: "Criar Conta", "Efetuar Login", "Explorar e Filtrar Pets", "Visualizar Detalhes do Pet", "Gerar e Compartilhar Flyer"
   - Usuário Autenticado conecta em: "Publicar Pet Perdido/Encontrado", "Informar Avistamento", "Conversar via Chat em Tempo Real", "Gerenciar Meus Anúncios", "Gerenciar Perfil e Notificações"
   - Administrador conecta em: "Moderar Publicações", "Analisar Denúncias"

5. Relacionamentos de Inclusão e Extensão:
   - "Criar Conta" tem <<include>> para "Verificar Conta por WhatsApp"
   - "Publicar Pet Perdido/Encontrado" tem <<include>> para "Ajustar e Cortar Fotos"
   - "Publicar Pet Perdido/Encontrado" tem <<include>> para "Selecionar Ponto no Mapa"
   - "Informar Avistamento" tem <<include>> para "Selecionar Ponto no Mapa"
   - "Publicar para Tutor Terceiro" tem <<extend>> para "Publicar Pet Perdido/Encontrado"
   - "Notificar Tutor no WhatsApp" tem <<extend>> para "Informar Avistamento"
   - "Gerar e Compartilhar Flyer" tem <<extend>> para "Visualizar Detalhes do Pet"

6. Integrações com Sistemas Externos:
   - "Verificar Conta por WhatsApp" comunica com "Evolution API (WhatsApp)"
   - "Notificar Tutor no WhatsApp" comunica com "Evolution API (WhatsApp)"
   - "Selecionar Ponto no Mapa" comunica com "Serviço de Mapas e GPS"

Gere com visual limpo, atores bem posicionados e setas pontilhadas para <<include>> e <<extend>>.
```

---

## ⚡ 2. Importação Direta via PlantUML no Lucidchart

Caso prefira importar a estrutura exata sem depender da IA gerativa:

1. No Lucidchart, clique em **Arquivo (File) > Importar dados (Import Data)**.
2. Escolha **PlantUML**.
3. Cole o código abaixo e clique em **Importar**:

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam actorStyle awesome

actor "Visitante" as Visitor
actor "Usuário Autenticado" as User
actor "Administrador" as Admin
actor "Evolution API\n(WhatsApp)" as WhatsApp <<Service>>
actor "Serviço de Mapas\n(GPS / Geocoding)" as Maps <<Service>>

User --|> Visitor

rectangle "Aplicativo WeFIND" {
  usecase "Criar Conta" as UC1
  usecase "Verificar Conta por WhatsApp" as UC2
  usecase "Efetuar Login" as UC3
  usecase "Gerenciar Perfil e Notificações" as UC4
  usecase "Explorar e Filtrar Pets" as UC5
  usecase "Visualizar Detalhes do Pet" as UC6
  usecase "Publicar Pet Perdido/Encontrado" as UC7
  usecase "Ajustar e Cortar Fotos" as UC8
  usecase "Publicar para Tutor Terceiro" as UC9
  usecase "Gerar e Compartilhar Flyer" as UC10
  usecase "Gerenciar Meus Anúncios" as UC11
  usecase "Informar Avistamento" as UC12
  usecase "Selecionar Ponto no Mapa" as UC13
  usecase "Notificar Tutor no WhatsApp" as UC14
  usecase "Conversar via Chat em Tempo Real" as UC15
  usecase "Moderar Publicações" as UC16
  usecase "Analisar Denúncias" as UC17
}

Visitor --> UC1
Visitor --> UC3
Visitor --> UC5
Visitor --> UC6
Visitor --> UC10

User --> UC7
User --> UC12
User --> UC15
User --> UC11
User --> UC4

Admin --> UC16
Admin --> UC17

UC1 ..> UC2 : <<include>>
UC7 ..> UC8 : <<include>>
UC7 ..> UC13 : <<include>>
UC12 ..> UC13 : <<include>>

UC9 ..> UC7 : <<extend>>
UC14 ..> UC12 : <<extend>>
UC10 ..> UC6 : <<extend>>

UC2 -- WhatsApp
UC14 -- WhatsApp
UC13 -- Maps
@enduml
```
