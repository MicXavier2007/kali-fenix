# Especificação da estação Kali remota

Este diretório público contém a referência de implantação da estação remota. **Não é um instalador automático.**

## Componentes previstos

- Kali Linux Rolling em uma VM/VPS compatível.
- XFCE como ambiente gráfico opcional.
- SSH para administração e manutenção.
- Apache Guacamole para acesso remoto via navegador.
- HTTPS, autenticação forte e MFA na camada de acesso.
- Função Netlify `kali-portal.mjs` para redirecionar ao portal configurado.

## Estado

A estação remota permanece opcional e depende de uma VM/VPS que o responsável pelo projeto contrate ou disponibilize. A página Fenix Linux é independente e usa um emulador Linux minimalista no navegador; ela não substitui esta estação Kali.

Consulte `../../FENIX-KALI-BROWSER-SETUP.md` para a sequência geral de implantação.
