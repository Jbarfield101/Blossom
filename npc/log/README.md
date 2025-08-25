# NPC Import Log

Entries are appended in JSON Lines format to `npc-import.log`. Each line is a JSON object with:

- `timestamp`: ISO 8601 string when the NPC was saved
- `world`: the world identifier
- `id`: NPC id
- `name`: NPC name

Example:

```json
{"timestamp":"2024-01-01T12:00:00Z","world":"forgotten-realms","id":"abc123","name":"Elminster"}
```
