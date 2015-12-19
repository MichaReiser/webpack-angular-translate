## 0.1.0 (2015-12-19)

Features:
- Remove translations during recompilation, avoids *duplicate* translations error when translation has been changed
- Emit a warning if a translation without an id is used (e.g. `<div translate><span>text</span></div>`)
- Include line and column numbers in warning and error messages
- Emit an error if a loader is registered, but the plugin is not

Bugfixes:

  - Correctly register empty elements with translate attribute (`<any translate='test'></any>`)