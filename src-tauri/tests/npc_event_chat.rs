use blossom_lib::commands::parse_npc_event;

#[test]
fn parse_npc_event_valid() {
    let json = "{\"who\":\"Alice\",\"action\":\"attack\",\"targets\":[\"orc\"],\"effects\":[\"hit\"],\"narration\":\"Alice hits the orc.\"}";
    let event = parse_npc_event(json).unwrap();
    assert_eq!(event.who, "Alice");
    assert_eq!(event.targets, vec!["orc"]);
    assert_eq!(event.narration, "Alice hits the orc.");
}

#[test]
fn parse_npc_event_invalid() {
    let json = "{\"who\":\"Bob\"}"; // missing fields
    assert!(parse_npc_event(json).is_err());
}

