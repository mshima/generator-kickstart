# Example Template

A minimal built-in template for trying out generator-parse.

```json liquid package.json
{% # package.json %}
{
  "name": "my-project",
  "version": "1.0.0",
  "description": "",
  "scripts": {
    "start": "node src/index.js"
  }
}
```

```javascript liquid src/index.js
{% # src/index.js %}
console.log('Hello from generator-parse!');
```

```md liquid README.md
{% # README.md %}

# My Project
```
