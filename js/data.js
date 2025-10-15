// data.js
// Contiene i dati dei Tratti di Campagna (TC) e le statistiche base.

// Map degli attributi dei TC. Ogni codice TC mappa a titolo, narrativa e regole RAW.
export const TC_DATA = {
  "TC01": {
    title: "Incaricato dell’Archivio (Ordine dei Pathfinder)",
    narr: "Come Incaricato dell’Archivio, sei un agente della Società dei Pathfinder incaricato di cercare, studiare e preservare la storia di Golarion... Nel torneo rappresenti questa tradizione: i tuoi appunti, la tua memoria fotografica e la tua capacità di sostituire qualunque prova con la conoscenza storica sono strumenti per documentare i misteri dell’Arena e riportarli al Grand Lodge.",
    raw: [
      "+1 a Diplomazia, Conoscenze (storia) e Conoscenze (piani).",
      "Storia e Piani diventano abilità di classe.",
      "1/giorno: puoi ritirare Diplomazia prima di conoscere l’esito.",
      "1/giorno: puoi tirare Conoscenze (storia) al posto di un’altra prova sensata (a giudizio del GM)."
    ]
  },
  "TC02": {
    title: "Protetto del Padiglione Grigio (Regenti di Giada / Tian Xia)",
    narr: "Protetto da un mecenate di Tian Xia... Sai leggere gli indizi culturali e superare barriere razziali senza penalità: porti la raffinatezza di Tian Xia in un torneo dominato da occidentali.",
    raw: [
      "+1 a Raggirare, Furtività, Sopravvivenza; tutte e tre abilità di classe.",
      "Intuizione diventa abilità di classe; bonus morale a Intuizione pari a 1/2 livello (min. +1).",
      "Etichetta di corte (Tian Xia): +1 a Linguistica; abilità di classe; +1 lingua bonus (GM approva).",
      "Familiarità arma orientale: scegli 1 arma orientale; se esotica la tratti come marziale; se marziale: +1 ad Artigianato (armaiolo) e Conoscenze (locali)."
    ]
  },
  "TC03": {
    title: "Volontà Infrangibile (Custodi del Sangue Rosso — redenzione)",
    narr: "Scisma dei Signori del Sangue di Geb... usi autorità e intimidazione per spezzare il controllo altrui.",
    raw: [
      "+1 ai TS Volontà.",
      "1/giorno: puoi ritirare un TS contro influenza mentale.",
      "Intimidire diventa abilità di classe; bonus morale a Intimidire pari a 1/2 livello (min. +1)."
    ]
  },
  "TC04": {
    title: "Eco di un Altro Sé (I Senza-Nome)",
    narr: "Visioni di cicli dimenticati della Fangwood... liberi dai vincoli d’allineamento cerchi significato nell’Arena.",
    raw: [
      "+1 a Conoscenze (arcane) e Conoscenze (religioni); entrambe abilità di classe.",
      "1/giorno: ritira un TS contro illusioni o confusione.",
      "1/giorno: ritenta Sapienza Magica oppure Conoscenze (religioni).",
      "Allineamenti slegati: ignori vincoli d’allineamento di classe/razza (codici divini a discrezione del GM)."
    ]
  },
  "TC05": {
    title: "Sentinella del Vento (Circuiti messaggeri dell’Arena)",
    narr: "Addestrato nello stile dei Chernasardo Rangers... rapido, silenzioso e vigile.",
    raw: [
      "+1 ai TS Riflessi.",
      "+1 a Disattivare Congegni e Acrobazia; entrambe abilità di classe.",
      "Scoprire Trappole (come il Ladro): +1/2 livello a Percezione (trappole) e Disattivare Congegni; puoi disinnescare trappole magiche."
    ]
  },
  "TC06": {
    title: "Custode delle Rovine (Archeologi di Campo / Osirion)",
    narr: "Osirion riaperto al mondo dal Principe di Rubino Khemet III... affronti l’Arena con l’oscuro splendore delle tombe.",
    raw: [
      "+1 ai TS Tempra.",
      "+1 a Conoscenze (dungeon) e Conoscenze (natura); entrambe abilità di classe.",
      "1/giorno: ritira un TS contro trappole o veleni.",
      "Linguaggi “costante” (solo lettura magica): leggi/comprendi immediatamente rune, glifi e scritte magiche (non parlare)."
    ]
  }
};

// Lista delle 6 statistiche base
export const STATS = ["For","Des","Cos","Int","Sag","Car"];
