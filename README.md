📚 Sistema de Biblioteca – Gerenciamento Offline

Sistema completo para gerenciamento de bibliotecas, desenvolvido em Node.js, com foco em simplicidade, organização e uso offline.
Ideal para bibliotecas escolares, comunitárias ou projetos educacionais.

🚀 Funcionalidades
📘 Livros

Cadastro, edição e remoção de livros

Controle de quantidade disponível

Busca rápida por título ou categoria

👤 Pessoas

Cadastro de leitores

Validação de e-mail (não permite duplicados)

Histórico de empréstimos

🔄 Empréstimos

Registro de empréstimos e devoluções

Controle de quantidade disponível

Histórico por pessoa

Bloqueio de remoção quando há vínculo ativo

🛡️ Segurança

Sistema de login

Controle de acesso

Proteção contra exclusão indevida

Validação de dados no backend

🖥️ Interface

Interface simples e responsiva

Funciona 100% offline

Layout limpo e fácil de usar

🛠️ Tecnologias Utilizadas

Node.js

Express

SQLite

HTML / CSS / JavaScript

Git & GitHub

📂 Estrutura do Projeto
biblioteca-offline/
│
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
├── db.js
├── server.js
├── package.json
├── README.md
└── .gitignore

▶️ Como executar o projeto
1️⃣ Instale as dependências
npm install

2️⃣ Inicie o servidor
npm start

3️⃣ Acesse no navegador
http://localhost:3000

👤 Usuários Padrão
Usuário	Senha
admin	admin123

(Pode ser alterado no banco de dados)

📦 Observações Importantes

O banco de dados é local (SQLite)

O projeto funciona offline

Não subir node_modules nem arquivos .sqlite para o GitHub

🚀 Próximas melhorias (ideias)

Exportação em PDF / Excel

Controle de atrasos

Sistema de permissões (admin / funcionário)

Histórico detalhado por usuário

Versão instalável (Electron)

👨‍💻 Autor

Desenvolvido por Vitor Dutra Melo
📧 Contato: vitordutra1125@gmail.com
