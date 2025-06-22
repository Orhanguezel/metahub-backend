rm -rf dist
npx tsc --noEmit
bun run build

bun run dev





# Temizlik için:
rm -rf dist
rm -rf build
rm -rf .turbo
rm -rf .next
rm -rf node_modules/.cache
npx tsc --noEmit
bun run build

bun run dev


npx ts-node -r tsconfig-paths/register src/generateMeta.ts