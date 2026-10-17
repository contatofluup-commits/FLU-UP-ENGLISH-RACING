# 🏎️ Flu Up English Racing — Multiplayer

Jogo original de corrida educacional para a Flu Up English School. Um professor cria uma sala e até quatro alunos competem simultaneamente por meio de um link e código. Perguntas A1–B2 com diversos verbos, tempos e estruturas; acertos ativam turbo. O progresso e o placar são calculados no servidor e enviados em tempo real.

## Executar no computador

Instale Node.js 18 ou mais recente e execute na pasta do projeto:

```bash
npm install
npm start
```

Abra `http://localhost:3000` no navegador. Crie uma sala como professora. Em outras abas, entre como aluno usando o código.

## Teste em dispositivos na mesma rede Wi-Fi

Encontre o endereço IP local do computador servidor e abra `http://IP_DO_COMPUTADOR:3000` nos celulares, conectados à mesma rede Wi-Fi. O firewall deve permitir conexões à porta 3000. `localhost` em outro aparelho não aponta para seu computador.

## Publicar para alunos em outras casas

Hospede este projeto como um serviço **Node.js Web Service**, com comando de instalação `npm install`, comando de inicialização `npm start` e acesso público via HTTPS (por exemplo, Render ou Railway). A hospedagem precisa suportar conexões **WebSocket**; uma hospedagem apenas de HTML estático não serve. Compartilhe a URL HTTPS pública gerada pelo serviço.

**Atenção:** o projeto não foi publicado automaticamente. Não existe um link de sala funcional na internet até que você o hospede. Para um serviço com instâncias múltiplas, será preciso também compartilhar o estado das salas, por exemplo com Redis. Nesta versão, mantenha **uma única instância** e evite que o servidor hiberne durante a aula.

## Fluxo de aula

1. Professora abre o site, escolhe nível e clica em **Criar sala**.
2. Compartilha o link gerado.
3. Cada aluno digita nome e entra; até quatro alunos por sala.
4. Professora vê o lobby e clica em **Começar a corrida**.
5. Alunos respondem questões individualmente, ganham turbo, mudam de faixa e acompanham o placar.
6. Professora vê os acertos e erros e pode iniciar outra corrida.

## Escopo e limitações

- O servidor mantém as salas apenas na memória: reiniciar o servidor encerra as salas existentes.
- Nesta versão não há banco de dados, contas de alunos, persistência de histórico, colisões ou objetos coletáveis na pista.
- A movimentação visual da faixa é controlada pelo aluno, mas a velocidade depende principalmente dos acertos; não é ainda um jogo de direção com física realista.
- Em caso de desconexão, recarregar não recupera automaticamente a posição anterior.
- O código da sala fornece acesso à sala, mas não é autenticação forte; evite divulgar em público.
- O painel da professora acompanha placar e respostas agregadas; relatórios históricos ainda não estão implementados.

## Arquivos

- `server.js` — salas e corrida sincronizadas via Socket.IO
- `questions.json` — 40 desafios gramaticais A1–B2
- `public/index.html` — interface responsiva
- `public/client.js` — renderização da pista e ações dos participantes
