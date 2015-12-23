## 0.1.2 (2015-12-23)

Bugfixes: 
- Only extract translation from attributes that use real expressions (0369ca011c9b7c958ca7cb10a4bb334ec072565d)

## 0.1.1 (2015-12-21)

Bugfixes: 
- Correctly handle elements with translated element content and attribute (c1656320c1bafbe1ee8c7a2094dbca89ec2610b5)

## 0.1.0 (2015-12-19)

Features:
- Remove translations during recompilation, avoids *duplicate* translations error when translation has been changed
- Emit a warning if a translation without an id is used (e.g. `<div translate><span>text</span></div>`)
- Include line and column numbers in warning and error messages
- Emit an error if a loader is registered, but the plugin is not

Bugfixes:
  - Correctly register empty elements with translate attribute (`<any translate='test'></any>`)