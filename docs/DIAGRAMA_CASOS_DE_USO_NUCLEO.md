# Diagrama de casos de uso — escopo funcional central

```mermaid
flowchart LR
    V[Visitante]
    U[Usuário autenticado]
    A[Administrador]

    subgraph W[Aplicativo WeFIND]
        C1((Criar e acessar conta))
        C2((Consultar ocorrências))
        C3((Visualizar ocorrências no mapa))
        C4((Pesquisar e filtrar ocorrências))
        C5((Publicar ocorrência perdida ou encontrada))
        C6((Atualizar ocorrência própria))
        C7((Traçar rota até o local informado))
        C8((Sugerir correspondências entre ocorrências))
        C9((Registrar avistamento))
        C10((Consultar e atualizar avistamentos próprios))
        C11((Trocar mensagens sobre ocorrência))
        C12((Consultar avisos da busca))
        C13((Denunciar conteúdo))
        C14((Analisar denúncias e moderar conteúdo))
        C15((Gerar e compartilhar cartaz de divulgação))
        C16((Expirar e remover publicação não renovada))
    end

    V --- C1
    V --- C2
    V --- C3
    V --- C4
    U --- C2
    U --- C3
    U --- C4
    U --- C5
    U --- C6
    U --- C7
    U --- C8
    U --- C9
    U --- C10
    U --- C11
    U --- C12
    A --- C13
    U --- C14
    U --- C15
    U --- C16
```

O diagrama resume os requisitos funcionais centrais do Capítulo 4. Operações correlatas são agrupadas em casos de uso para manter a visão legível; recursos complementares implementados não são representados nesta figura.
