📚 Sistema de Biblioteca – Gestão de Empréstimos

Sistema completo de gerenciamento de biblioteca desenvolvido em Node.js, com controle de usuários, livros e empréstimos.
Projeto criado com foco em organização, clareza e boas práticas, simulando um sistema real de uso administrativo.

🚀 Funcionalidades
👤 Usuários

Cadastro de usuários

Exclusão de usuários

Controle de acesso via login

Painel administrativo protegido por token

📚 Livros

Cadastro de livros

Controle de quantidade disponível

Exclusão de livros

Atualização automática do estoque

🔁 Empréstimos

Registro de empréstimos

Devolução de livros

Atualização automática do estoque

Histórico de empréstimos

Controle de status (emprestado / devolvido)

🔐 Segurança

Autenticação por login

Área administrativa protegida por token

Rotas protegidas no backend

Separação entre usuários comuns e administradores

🖥️ Tecnologias Utilizadas

Node.js

Express

SQLite

HTML5

CSS3

JavaScript (Vanilla)

Fetch API

Git / GitHub

📂 Estrutura do Projeto
Sistema-Biblioteca/
│
├── public/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│
├── server.js
├── db.js
├── package.json
└── README.md

▶️ Como rodar o projeto localmente
1️⃣ Clone o repositório
git clone https://github.com/seu-usuario/Sistema-Biblioteca.git

2️⃣ Entre na pasta
cd Sistema-Biblioteca

3️⃣ Instale as dependências
npm install

4️⃣ Inicie o servidor
npm start

5️⃣ Acesse no navegador
http://localhost:3000

🔐 Acesso administrativo

O sistema possui uma área administrativa protegida por token.

Para acessar:

Vá até a aba Admin

Insira o token configurado no backend (ADMIN_TOKEN)

Após validado, você poderá:

Criar usuários

Editar usuários

Excluir usuários

📌 Observações Importantes

O banco de dados é criado automaticamente ao iniciar o projeto.

O arquivo .db não deve ser versionado no GitHub.

O sistema foi pensado para funcionar localmente, mas pode ser facilmente adaptado para produção.

🚀 Melhorias Futuras (Roadmap)

Sistema de permissões por perfil (admin / operador)

Histórico de atividades (logs)

Dashboard com métricas

Paginação e filtros avançados

Deploy em servidor (Render, Railway ou VPS)

👨‍💻 Autor

Vitor Dutra Melo
Desenvolvedor Full Stack

📧 Contato: adicione seu email aqui
🔗 GitHub: link do repositório
