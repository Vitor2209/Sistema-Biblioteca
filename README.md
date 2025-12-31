📚 Sistema de Biblioteca Offline

Sistema completo de gerenciamento de biblioteca desenvolvido em Node.js + SQLite, com interface moderna em HTML/CSS/JavaScript, funcionando totalmente offline.

Ideal para bibliotecas comunitárias, escolas, igrejas ou projetos educacionais.

🚀 Funcionalidades
📘 Gerenciamento de Livros

Cadastro de livros (título, autor, categoria, prateleira)

Controle de quantidade disponível

Remoção segura (bloqueada se houver histórico)

Busca instantânea

👤 Gestão de Pessoas

Cadastro de leitores

Validação de e-mail (não permite duplicados)

Histórico completo de empréstimos

🔁 Empréstimos

Empréstimo de múltiplos livros

Devolução parcial ou total

Renovação de prazo

Controle de atrasos

Histórico completo por pessoa

📊 Dashboard

Total de livros

Livros disponíveis

Empréstimos ativos

Atrasados

🔐 Usuários & Segurança

Login com sessão

Perfis: admin e staff

Controle de permissões

Logs de ações (auditoria)

💾 Backup e Restauração

Backup manual do banco

Restauração por upload

Ideal para uso offline

🧱 Tecnologias Utilizadas

Node.js (backend)

SQLite (banco de dados local)

HTML / CSS / JavaScript puro

Express (API)

Sem frameworks pesados

Totalmente offline

▶️ Como Rodar o Projeto
1. Instale as dependências
npm install

2. Inicie o sistema
npm start

3. Acesse no navegador
http://localhost:3000

🔐 Usuários padrão
Usuário	Senha	Perfil
admin	admin123	Administrador
bibliotecario	staff123	Funcionário
📂 Estrutura do Projeto
biblioteca-offline/
│
├── public/
│   ├── app.js         # Lógica do front-end
│   ├── styles.css     # Estilos
│   └── index.html     # Interface principal
│
├── db.js              # Banco de dados SQLite
├── server.js          # Backend (API)
├── package.json
├── backups/           # Backups automáticos
└── README.md

🔒 Regras Importantes

Não é possível apagar pessoas que tenham histórico de empréstimo

Emails são únicos (não permite duplicados)

O sistema funciona totalmente offline

Todas as ações importantes são registradas

💡 Próximas melhorias (planejadas)

📱 Versão mobile otimizada (PWA)

📊 Relatórios em PDF

📦 Importação/exportação de dados

🏷️ Código de barras / QR Code

📅 Notificações de atraso

📌 Observação

Para evitar erros:

Sempre acesse pelo http://localhost:3000

Não abra o HTML direto no navegador

Sempre reinicie o servidor após alterações
