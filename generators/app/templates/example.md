# Example Template

A minimal built-in template for trying out generator-parse.

```json liquid package.json
{
  "name": "my-project",
  "version": "1.0.0",
  "description": "",
  "scripts": {
    "start": "node src/index.js"
  }
}
{% # package.json %}
```

```javascript liquid src/index.js
console.log('Hello from generator-parse!');
{% # src/index.js %}
```

```md liquid README.md
# My Project

{% # README.md %}
```
