# Diagrama de Classes Conceitual — WeFIND

Este diagrama representa o **modelo conceitual de domínio** do WeFIND, uma
plataforma comunitária para localização e recuperação de animais perdidos ou
encontrados. Ele foi separado do modelo técnico para que possa ser utilizado
diretamente na documentação do TCC.

Os atributos usam visibilidade privada (`-`) e operações usam visibilidade
pública (`+`). Os tipos foram explicitados para facilitar a leitura acadêmica:
`String`, `Integer`, `Boolean`, `Date`, `Decimal` e `List<String>`. Os métodos
sem retorno explícito não exibem o tipo `void`.

## Diagrama

O código-fonte está em
[`DIAGRAMA_CLASSES_CONCEITUAL.puml`](./DIAGRAMA_CLASSES_CONCEITUAL.puml) e pode
ser renderizado no PlantUML, no Visual Studio Code ou importado no Astah e no
Lucidchart.

A versão Mermaid completa, com visibilidade, tipos, métodos e namespaces, está
disponível em [`DIAGRAMA_CLASSES_CONCEITUAL.mmd`](./DIAGRAMA_CLASSES_CONCEITUAL.mmd).

Para a seção de modelagem conceitual do TCC, recomenda-se a versão resumida,
disponível em [`DIAGRAMA_CLASSES_CONCEITUAL_RESUMIDO.mmd`](./DIAGRAMA_CLASSES_CONCEITUAL_RESUMIDO.mmd).
Ela apresenta somente os conceitos essenciais do domínio, sem métodos, serviços
ou detalhes específicos de implementação. Os atributos são apresentados apenas
pelos seus nomes, e as relações exibem as cardinalidades relevantes do negócio.

```mermaid
classDiagram
    class Usuario {
        -id: String
        -nome: String
        -email: String
        -telefone: String
        -perfil: String
        -status: String
        -pontos: Integer
        -nivel: Integer
        +atualizarPerfil()
        +consultarPontuacao() Integer
    }

    class PerfilVoluntario {
        -ativo: Boolean
        -especiesAceitas: List~String~
        -portesAceitos: List~String~
        -tipoMoradia: String
        -localizacao: String
        +ativar()
        +desativar()
    }

    class PetCadastrado {
        -id: String
        -nome: String
        -especie: String
        -raca: String
        -cuidados: String
        -vacinas: String
        +atualizarDados()
    }

    class Publicacao {
        -id: Integer
        -titulo: String
        -descricao: String
        -tipo: String
        -situacao: String
        -finalidade: String
        -localizacao: String
        -dataOcorrencia: Date
        -resolvida: Boolean
        -expiraEm: Date
        +criar()
        +atualizar()
        +marcarComoResolvida()
    }

    class Foto {
        -id: String
        -url: String
        -principal: Boolean
        +adicionar()
        +remover()
    }

    class Avistamento {
        -id: String
        -descricao: String
        -localizacao: String
        -data: Date
        -status: String
        +registrar()
    }

    class Reivindicacao {
        -id: String
        -mensagem: String
        -comprovante: String
        -status: String
        -data: Date
        +enviar()
        +avaliar()
    }

    class Recompensa {
        -valor: Decimal
        -descricao: String
        -status: String
        +oferecer()
        +cancelar()
    }

    class ReivindicacaoRecompensa {
        -id: String
        -mensagem: String
        -status: String
        -solicitadaEm: Date
        +solicitar()
        +avaliar()
    }

    class Conversa {
        -id: String
        -iniciadaEm: Date
        -arquivada: Boolean
        +iniciar()
        +arquivar()
    }

    class Mensagem {
        -id: Integer
        -conteudo: String
        -lida: Boolean
        -enviadaEm: Date
        +enviar()
        +marcarComoLida()
    }

    class Notificacao {
        -id: String
        -titulo: String
        -mensagem: String
        -tipo: String
        -lida: Boolean
        -criadaEm: Date
        +enviar()
        +marcarComoLida()
    }

    class HistoriaFeliz {
        -id: String
        -titulo: String
        -relato: String
        -foto: String
        -publicadaEm: Date
        +publicar()
    }

    class Denuncia {
        -id: String
        -motivo: String
        -detalhes: String
        -status: String
        -resolucao: String
        +registrar()
        +moderar()
    }

    class Avaliacao {
        -nota: Integer
        -comentario: String
        -data: Date
        +registrar()
    }

    Usuario "1" *-- "0..1" PerfilVoluntario : configura
    Usuario "1" *-- "0..*" PetCadastrado : cadastra
    Usuario "1" --> "0..*" Publicacao : cria
    PetCadastrado "0..1" --> "0..*" Publicacao : pode originar
    Publicacao "1" *-- "0..*" Foto : possui
    Publicacao "1" *-- "0..*" Avistamento : recebe
    Usuario "1" --> "0..*" Avistamento : registra
    Publicacao "1" *-- "0..1" Recompensa : oferece
    Publicacao "1" --> "0..*" Reivindicacao : recebe
    Usuario "1" --> "0..*" Reivindicacao : envia
    Recompensa "1" --> "0..*" ReivindicacaoRecompensa : recebe
    Usuario "1" --> "0..*" ReivindicacaoRecompensa : solicita
    Conversa "1" *-- "1..*" Mensagem : contem
    Usuario "1" --> "0..*" Conversa : participa
    Usuario "1" --> "0..*" Mensagem : envia
    Usuario "1" --> "0..*" Mensagem : recebe
    Publicacao "0..1" --> "0..*" Conversa : contextualiza
    Usuario "1" --> "0..*" Notificacao : recebe
    Publicacao "0..1" --> "0..*" HistoriaFeliz : origina
    Usuario "0..1" --> "0..*" HistoriaFeliz : publica
    Publicacao "0..1" --> "0..*" Denuncia : alvo
    Usuario "1" --> "0..*" Denuncia : registra
    Usuario "0..1" --> "0..*" Denuncia : analisa
    Usuario "1" --> "0..*" Avaliacao : realiza
    Usuario "1" --> "0..*" Avaliacao : recebe
```

## Interpretação para o TCC

### O que caracteriza o modelo conceitual

No modelo conceitual, as classes representam conceitos reconhecidos pelos
usuários e pelas regras do negócio. Por isso, são priorizados `Usuario`,
`Pet`, `Publicacao`, `Avistamento`, `Reivindicacao`, `Conversa` e as demais
entidades diretamente relacionadas ao funcionamento da plataforma. Métodos,
tipos de retorno, classes de serviço, APIs e tabelas do banco pertencem a
modelos mais detalhados, como o diagrama lógico ou de implementação.

Na versão resumida, os atributos são mantidos somente quando ajudam a
identificar o conceito, sem visibilidade ou tipos. Como o diagrama conceitual
não detalha operações, também não são representados métodos públicos (`+`).
Essa escolha mantém o modelo focado no domínio e evita confundi-lo com um
modelo lógico ou de implementação.

- **Usuario** é o participante autenticado que publica, registra
  avistamentos, troca mensagens e interage com a comunidade.
- **Publicacao** é a entidade central: representa um animal perdido ou
  encontrado e concentra fotos, avistamentos, reivindicações e recompensa.
- **PerfilVoluntario** registra a disponibilidade de uma pessoa para oferecer
  lar temporário.
- **Mensagem** possui dois papéis de associação com `Usuario`: remetente e
  destinatário. A publicação é opcional e fornece o contexto da conversa.
- **HistoriaFeliz** representa o relato público de um reencontro bem-sucedido.
- **Denuncia** permite que uma publicação seja encaminhada para análise de
  moderação.

As cardinalidades expressam as regras principais do domínio. Por exemplo, um
usuário pode criar várias publicações (`1 : 0..*`), uma publicação pode possuir
até uma recompensa (`1 : 0..1`) e uma publicação pode receber vários
avistamentos (`1 : 0..*`).

## Observação metodológica

Este é um diagrama **conceitual**, portanto não reproduz todas as colunas do
Supabase nem os serviços da aplicação. Classes técnicas como autenticação,
armazenamento, notificações push e integração com WhatsApp são mecanismos de
implementação e podem ser apresentados separadamente no diagrama de
arquitetura.
