📚 Sistema de Biblioteca — Gestão Completa
<p align="center"> <img src="https://img.shields.io/badge/Status-Em%20Desenvolvimento-yellow" /> <img src="https://img.shields.io/badge/Node.js-Backend-green" /> <img src="https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JS-blue" /> <img src="https://img.shields.io/badge/Database-SQLite-lightgrey" /> </p>

Sistema completo para gerenciamento de biblioteca com controle de usuários, livros, empréstimos e painel administrativo.

✨ Visão Geral

Este projeto simula um sistema real de biblioteca, com controle total de:

usuários

livros

empréstimos

devoluções

permissões administrativas

Tudo foi construído sem frameworks, apenas com Node.js, JavaScript puro e SQLite, focando em lógica, organização e boas práticas.

🖥️ Demonstração (exemplo visual)

(adicione prints aqui depois)

📌 Tela inicial
📌 Painel administrativo
📌 Cadastro de livros
📌 Controle de empréstimos

⚙️ Funcionalidades
👤 Usuários

Criar usuários

Excluir usuários

Controle por login

Permissões administrativas

📚 Livros

Cadastro de livros

Controle de estoque

Exclusão segura

Atualização automática de quantidade

🔁 Empréstimos

Registrar empréstimo

Devolver livro

Controle automático de estoque

Histórico de operações

🔐 Segurança

Login com autenticação

Área administrativa protegida por token

Rotas protegidas no backend

🧠 Tecnologias Utilizadas
Tecnologia	Uso
Node.js	Backend
Express	Servidor HTTP
SQLite	Banco de dados
HTML5	Estrutura
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

▶️ Como rodar o projeto
# Clone o repositório
git clone https://github.com/seu-usuario/Sistema-Biblioteca.git

# Entre na pasta
cd Sistema-Biblioteca

# Instale as dependências
npm install

# Inicie o servidor
npm start


Acesse no navegador:

http://localhost:3000

🔐 Painel Administrativo

O sistema possui um painel administrativo protegido por token, onde é possível:

Criar usuários

Editar usuários

Remover usuários

Gerenciar permissões

O token é configurado no backend e não deve ser exposto publicamente.

🚀 Próximas melhorias

Autenticação JWT

Controle de níveis de acesso

Dashboard com gráficos

Histórico detalhado de ações

Deploy em produção (Render / Railway)

👨‍💻 Autor

Vitor Dutra Melo
Desenvolvedor Full Stack

📧 Email: adicione aqui
🔗 GitHub: https://github.com/Vitor2209
