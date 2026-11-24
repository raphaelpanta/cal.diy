# CLAUDE.md

## Regras de negócio: horário comercial e fusos (feature exercicio-003)

Decisões tomadas pelo dono do produto em entrevista (2026-11-24). Não altere estas regras sem confirmação explícita. A feature ainda não foi implementada.

### Escopo e fuso base
- O horário comercial é definido **por usuário** (não por event type nem por organização).
- Os horários são interpretados no **fuso do organizador** (fuso do perfil do host).

### Horário de verão (DST)
- Usa-se **offset UTC fixo**, não a hora local de parede.
- O offset aplicado é o **offset do fuso no momento em que o usuário salvou** o horário comercial. Ele fica gravado e não acompanha as transições de DST posteriores.
- Comportamento intencional (confirmado após revisão): um horário salvo como 9h no inverno passa a aparecer como 10h ou 8h local após a mudança de DST.

### Troca de fuso do organizador
- Se o organizador mudar o fuso no perfil, o horário comercial é **convertido**: mantém os mesmos instantes absolutos (UTC), e as horas locais exibidas mudam.

### Intervalos
- São permitidos **vários intervalos por dia** (ex.: 9h–12h e 14h–18h).
- Intervalos **sobrepostos** no mesmo dia são **rejeitados na validação** (erro ao salvar, sem mesclagem automática).
- Expedientes que **passam da meia-noite** (ex.: 22h–06h) são suportados.
  - São armazenados/tratados **divididos por dia**: seg 22h–24h + ter 0h–06h.
  - Para calcular slots, pedaços **contíguos** entre dias formam uma janela contínua (ex.: slot 23h30–00h30 é permitido).

### Slots
- Um slot só é oferecido se **couber inteiro** (início e fim) dentro do horário comercial. Exemplo: com fim às 18h, um slot de 60 min às 17h30 não é oferecido.

### Overrides por data (feriados/exceções)
- Fazem parte do escopo.
- Um override **substitui** por completo a regra semanal daquele dia (não soma intervalos).
- A data do override é interpretada no **fuso local do organizador** (ex.: 25/12 = 25/12 00h–24h no horário local do host), não em UTC.
