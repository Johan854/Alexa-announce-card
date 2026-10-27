# Alexa Announce Card (FR)

Carte Home Assistant pour les **annonces Alexa** : boutons d'annonces rapides (À table, Les chiens…) et message personnalisé à envoyer. Style verre, thème clair/sombre automatique, éditeur visuel, textes en français.

## Installation (HACS)
HACS → ⋮ → Dépôts personnalisés → URL de ce dépôt, catégorie **Tableau de bord** → installer → recharger la page.

## Configuration
```yaml
type: custom:alexa-announce-card
title: Annonces Alexa
buttons:
  - name: 🍽️ À table
    icon: mdi:silverware-fork-knife
    entity: script.annonce_alexa
  - name: 🐶 Les chiens
    icon: mdi:dog
    entity: script.annonce_alexa_les_chiens
  - name: 🐰 Nourrir les animaux
    icon: mdi:rabbit
    entity: script.annonce_alexa_les_ouits_et_les_lapins
send_entity: script.annonce_alexa_personnalisee   # script d'envoi du message personnalisé
message_entity: input_text.message_alexa          # champ lu par ce script
```

| Option | Description |
|---|---|
| `buttons[]` | `name`, `icon`, `entity` (script, bouton ou scène) |
| `send_entity` | Script qui annonce le message personnalisé |
| `message_entity` | `input_text` dans lequel la carte écrit le message avant de lancer le script. Sans lui, le message est passé au script dans la variable `message` |
| `show_custom` | Afficher la zone de message |
| `placeholder`, `send_label`, `title`, `columns`, `theme` | Textes, titre, colonnes (0 = auto), thème |

Ctrl+Entrée envoie le message. Licence MIT.
