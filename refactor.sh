#!/bin/bash

# fix-internal-imports.sh

echo "Fixing internal imports in catalog folder..."

# Fix store.svelte.ts
sed -i \
  -e "s|from './niwrapSchema'|from './schema'|g" \
  -e "s|from './catalog'|from './types'|g" \
  -e "s|from '\$lib/services/catalog/types'|from './types'|g" \
  src/lib/services/catalog/store.svelte.ts

# Fix schema.ts if it imports from types
sed -i \
  -e "s|from './catalog'|from './types'|g" \
  -e "s|from '\$lib/services/catalog/types'|from './types'|g" \
  src/lib/services/catalog/schema.ts

# Fix execution folder internal imports
sed -i \
  -e "s|from './niwrapPythonSymbolmaps'|from './symbolmaps'|g" \
  -e "s|from './niwrapExecution'|from './niwrap'|g" \
  src/lib/services/execution/niwrap.ts 2>/dev/null || true

sed -i \
  -e "s|from './niwrapExecution'|from './niwrap'|g" \
  src/lib/services/execution/symbolmaps.ts 2>/dev/null || true

echo "Done! Run 'npm run check' to verify."