📚 Sistema de Biblioteca – Gerenciamento Offline

Sistema completo de gerenciamento de biblioteca desenvolvido em Node.js, focado em simplicidade, organização e funcionamento totalmente offline.
Ideal para bibliotecas escolares, comunitárias ou projetos educacionais.

🚀 Funcionalidades
📘 Gestão de Livros

Cadastro, edição e remoção de livros

Controle automático de quantidade disponível

Busca por título ou categoria

👤 Gestão de Usuários

Cadastro de leitores

Validação de e-mails (evita duplicações)

Histórico completo de empréstimos

🔄 Empréstimos

Registro de empréstimos e devoluções

Controle automático de disponibilidade

Bloqueio de remoção quando há empréstimos ativos

🔐 Segurança

Sistema de login

Controle de acesso

Validações no backend

Proteção contra exclusões indevidas

🖥️ Interface

Interface simples e intuitiva

Totalmente responsiva

Funciona 100% offline

🛠️ Tecnologias Utilizadas

Node.js

Express

SQLite

HTML5

CSS3

JavaScript

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

▶️ Como Executar o Projeto
1️⃣ Instale as dependências
npm install

2️⃣ Inicie o servidor
npm start

3️⃣ Acesse no navegador
http://localhost:3000

👤 Usuário Padrão
Usuário	Senha
admin	admin123

(Os dados podem ser alterados diretamente no banco de dados)

📌 Observações Importantes

O sistema utiliza SQLite, ideal para projetos locais e educacionais

Funciona offline, sem necessidade de internet


🚀 Próximas Melhorias (Roadmap)

📊 Relatórios em PDF ou Excel

⏱️ Controle de atrasos e multas

👥 Níveis de acesso (admin / funcionário)

🔐 Autenticação mais robusta

📱 Versão desktop com Electron

👨‍💻 Autor

Vitor Dutra Melo
Desenvolvedor Web | JavaScript | Node.js

📌 Projeto desenvolvido com foco em aprendizado, prática real e evolução profissional.
