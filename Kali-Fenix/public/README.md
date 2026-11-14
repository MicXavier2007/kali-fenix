# Kali Fenix

Portal enxuto para duas funções: catálogo oficial de ferramentas Kali Linux e acesso a uma estação Kali remota pelo navegador.

## Estrutura

- `public/`: apenas arquivos estáticos publicados (HTML, CSS, JS, imagens e guias).
- `netlify/functions/`: funções server-side, fora da pasta pública.
- `services/kali-workstation/`: instalador executado somente dentro da VM Kali.
- `netlify.toml`: configura publicação em `public`, funções em `netlify/functions` e Node.js 24.

## Publicar na Netlify

1. Envie o conteúdo desta pasta para a raiz de um repositório GitHub.
2. Importe o repositório na Netlify.
3. Deixe Base directory vazio, Build command vazio, Publish directory `public` e Functions directory `netlify/functions`.
4. O `netlify.toml` já contém essas configurações; elas prevalecem sobre os campos equivalentes da interface.
5. Faça o deploy.
6. Teste `/.netlify/functions/kali-catalog`. Deve retornar JSON com a lista de ferramentas publicada em kali.org.

A função `kali-portal` retorna HTTP 503 até que `FENIX_KALI_PORTAL_URL` seja definida com a URL HTTPS real do Guacamole. Isso é esperado antes de a estação remota existir.

## Ativar a estação remota

1. Provisione uma VM/VPS compatível com a arquitetura e o espaço necessários.
2. Instale Kali Rolling e leia `services/kali-workstation/README.md`.
3. Implante Apache Guacamole com `guacd`, autenticação por banco, HTTPS e MFA.
4. Mantenha SSH/RDP acessíveis apenas pela rede privada entre Guacamole e a VM.
5. Na Netlify, configure `FENIX_KALI_PORTAL_URL` como variável disponível às Functions.
6. Faça novo deploy e teste o botão de acesso.

Netlify hospeda o portal e as funções; não executa uma máquina virtual Kali.

## Catálogo versus execução

A listagem sincronizada é um catálogo documental oficial; não instala nem executa os programas. Para executar, os pacotes precisam estar instalados na VM. O metapacote `kali-linux-everything` é grande. A documentação do Kali estima cerca de 34 GB para Everything com XFCE na tabela publicada e recomenda planejar aproximadamente 60 GB de disco para acomodar a instalação com margem. Confirme o tamanho com APT antes de instalar.
