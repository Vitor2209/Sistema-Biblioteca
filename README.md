📚 Sistema de Biblioteca — Gestão Completa

<p align="center"> <img src="https://img.shields.io/badge/Status-Em%20Desenvolvimento-yellow" /> <img src="https://img.shields.io/badge/Node.js-Backend-green" /> <img src="https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JavaScript-blue" /> <img src="https://img.shields.io/badge/Database-SQLite-lightgrey" /> </p>

O Sistema de Biblioteca é uma aplicação completa para gerenciamento de bibliotecas, permitindo o controle de usuários, livros, empréstimos, devoluções e permissões administrativas.

O projeto foi desenvolvido com foco em lógica de negócio, organização de código e boas práticas, utilizando Node.js puro, sem frameworks frontend.

✨ Visão Geral

Este projeto simula um sistema real de biblioteca, oferecendo controle total sobre:

👤 Usuários

📚 Livros

🔁 Empréstimos e devoluções

🔐 Acesso administrativo

Toda a aplicação foi construída com JavaScript puro, Node.js e SQLite, priorizando entendimento profundo do funcionamento do backend.

🖥️ Demonstração (Visual)

Prints da aplicação podem ser adicionados aqui futuramente:

📌 Tela inicial

📌 Painel administrativo

📌 Cadastro de livros

📌 Controle de empréstimos

⚙️ Funcionalidades
👤 Gestão de Usuários

Criar usuários

Excluir usuários

Autenticação por login

Controle de permissões administrativas

📚 Gestão de Livros

Cadastro de livros

Controle automático de estoque

Atualização de quantidade

Exclusão segura de registros

🔁 Empréstimos

Registro de empréstimos

Devolução de livros

Atualização automática do estoque

Histórico de operações

🔐 Segurança

Sistema de login

Painel administrativo protegido por token

Rotas do backend protegidas

Separação entre usuários comuns e administradores

🧠 Tecnologias Utilizadas
Tecnologia	Uso
Node.js	Backend
Express.js	Servidor HTTP
SQLite	Banco de dados
HTML5	Estrutura do frontend
CSS3	Estilização
JavaScript	Lógica e interação
Git / GitHub	Versionamento
📁 Estrutura do Projeto
Sistema-Biblioteca/
│
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
├── server.js
├── db.js
├── package.json
└── README.md

▶️ Como Executar o Projeto

1️⃣ Clonar o repositório
git clone https://github.com/seu-usuario/Sistema-Biblioteca.git

2️⃣ Acessar a pasta do projeto
cd Sistema-Biblioteca

3️⃣ Instalar as dependências
npm install

4️⃣ Iniciar o servidor
npm start


A aplicação ficará disponível em:

http://localhost:3000

🔐 Painel Administrativo

O sistema possui um painel administrativo protegido, permitindo:

Criar usuários

Editar usuários

Remover usuários

Gerenciar permissões

⚠️ O token de acesso é configurado no backend e não deve ser exposto publicamente.

🚀 Próximas Melhorias (Roadmap)

🔐 Autenticação com JWT

👥 Controle de níveis de acesso

📊 Dashboard com gráficos

🧾 Histórico detalhado de ações

☁️ Deploy em produção (Render / Railway)

👨‍💻 Autor

Vitor Dutra Melo
Desenvolvedor Full Stack

📧 Email: vitordutra1125@gmail.com

🔗 GitHub: https://github.com/Vitor2209
