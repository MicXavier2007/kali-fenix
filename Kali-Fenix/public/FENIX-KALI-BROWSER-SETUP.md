# Guia de implantação — estação Kali remota

Este guia descreve a infraestrutura necessária para disponibilizar uma estação Kali real pelo navegador. Ele não instala uma VPS nem cria uma máquina virtual automaticamente.

## Arquitetura

1. Uma VM ou VPS executa Kali Linux.
2. A VM recebe um ambiente gráfico leve (por exemplo, XFCE) e SSH.
3. O Apache Guacamole publica o acesso remoto HTTPS.
4. A função Netlify `/.netlify/functions/kali-portal` redireciona o usuário para o portal configurado.
5. A variável de ambiente `FENIX_KALI_PORTAL_URL` guarda a URL HTTPS do portal.

## Requisitos de segurança

- Use uma URL HTTPS válida.
- Configure autenticação individual e, de preferência, MFA.
- Não exponha SSH, RDP, VNC ou portas do Guacamole sem controle de acesso.
- Restrinja o acesso à VM e monitore sessões e autenticações.
- Atualize o Kali e os serviços regularmente.
- Não armazene tokens ou senhas no HTML/JavaScript público.

## Configuração na Netlify

1. Abra **Site configuration → Environment variables**.
2. Crie `FENIX_KALI_PORTAL_URL` com a URL HTTPS do portal protegido.
3. Faça um novo deploy.
4. Teste `/.netlify/functions/kali-portal`.

Sem a variável, a função redireciona para `estacao-remota.html`, que explica que a estação não foi configurada e oferece links para Fenix Shell local, Fenix Linux e Python WebAssembly.

## Observação sobre custos

Netlify hospeda o site estático e a função de redirecionamento, não hospeda uma VM Kali persistente. A VM e o Guacamole exigem infraestrutura própria ou um serviço de terceiros. Não prometa acesso remoto gratuito permanente sem verificar os limites e as condições do provedor.
