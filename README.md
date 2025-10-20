# Torneo Cremesi — Sito (PF1e, ABP ON)

Questo repository contiene un sito statico completo per il **Torneo Cremesi**, una campagna di Pathfinder 1ª Edizione con **Automatic Bonus Progression (ABP ON)** e **Elephant in the Room (EITR ON)**. Il sito è suddiviso in due sezioni principali: **Parte A** per la consultazione (ambientazione, regole, catalogo di oggetti custom) e **Parte B** per la compilazione (scheda del personaggio e tracker dei Punti Arena e cicatrici). Tutti i dati sono salvati in locale tramite `localStorage`.

## Pubblicazione con GitHub Pages

1. Crea un nuovo repository su GitHub (es. `torneo-cremesi-site`) e carica **tutti** i file e le cartelle di questo pacchetto.
2. Vai su **Settings → Pages** del repository e scegli:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main`
   - **Folder**: `/root`
3. Salva le impostazioni. Dopo qualche minuto GitHub Pages pubblicherà il sito su `https://<tuo-username>.github.io/<nome-repo>/`.
4. Se ottieni un 404, assicurati che il file `index.html` sia in cima alla directory e prova a fare un commit (anche minimale) per forzare la ricostruzione.

## Struttura del sito

```
torneo-cremesi-site/
├─ index.html            # Pagina principale con router e template delle viste
├─ css/styles.css        # Stili CSS (tema scuro, layout sidebar)
├─ js/store.js           # Gestione localStorage e backup JSON
├─ js/data.js            # Dati dei Tratti di Campagna e liste di statistiche
├─ js/app.js             # Router e logica dell’interfaccia dinamica
├─ data/oggetti_custom.seed.json  # Esempi di oggetti custom
├─ assets/logo.svg       # Logo utilizzato nel sidebar
├─ assets/favicon.png    # (opzionale) Favicon per il sito
├─ docs/NOTE_SU_FONTI.txt # Appunti per eventuali materiali sorgente
└─ README.md             # Questo file
```

### Avvio Rapido

La sezione **Avvio Rapido** (default all’apertura del sito) riassume i passi principali per preparare un personaggio: scelta del TC, applicazione di ABP ON ed EITR ON, budget e restrizioni, creazione dell’oggetto custom e compilazione della scheda. Fornisce anche link rapidi alle altre sezioni.

### Parte A — Consultazione

- **Ambientazione**: descrive la Fangwood, la Discesa Celeste e la situazione iniziale del torneo.
- **Regole**: riepiloga il livello iniziale, il budget, le house rules EITR/ABP, il sistema a Punti Arena, cicatrici e glossario.
- **Oggetti Custom**: permette di consultare, creare e modificare oggetti magici custom; questi sono salvati in `localStorage` e possono essere importati nella scheda.

### Parte B — Modificabile

- **Scheda**: modulo per inserire dati anagrafici, statistiche, difese, attacchi, abilità, incantesimi, equipaggiamento, TC (con menu a tendina e auto-fill narrativo/RAW) e oggetto custom collegato al catalogo.
- **Tracker**: registra Punti Arena, cicatrici, corruzione e log delle sessioni. Include anche un mini-tracker per i personaggi del party.

## Persistenza e Backup

Tutti i dati compilati dall’utente sono conservati nel browser tramite `localStorage`. Puoi esportarli in un file JSON con il pulsante **Esporta JSON** e importarli successivamente con **Importa JSON**.

## Personalizzazione

- Modifica i TC e le relative descrizioni in `js/data.js`.
- Aggiungi oggetti custom di esempio o predefiniti in `data/oggetti_custom.seed.json`.
- Cambia l’aspetto del sito modificando `css/styles.css`.
- Se desideri importare materiale di riferimento (handout PDF, documenti), salvali in `docs/` (assicurati di rispettare i diritti d’autore).

## Aggiornare i dati da Archive of Nethys

Il progetto include uno script per scaricare e normalizzare i dati pubblici di Archive of Nethys (razze, classi, archetipi, tratti e tratti razziali alternativi) in formato JSON compatibile con il sito.

```bash
node scripts/fetch-aon-data.mjs
```

Lo script salva i file aggiornati nella cartella `data/` (`aon-races.json`, `aon-alt-traits.json`, `aon-classes.json`, `aon-archetypes.json`, `aon-traits.json`). Richiede una connessione Internet attiva per completare il download.

## Licenza

Il codice e i template di questo sito sono distribuiti sotto licenza **MIT** (includi un file LICENSE se desideri esplicitare la licenza). Il materiale testuale (ambientazione, regole) è soggetto alle politiche e alle licenze di Paizo; usalo solo per scopi personali o concordati con il GM.
