import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'

export default defineConfigWithVueTs(
  { name: 'app/files-to-lint', files: ['**/*.{ts,mts,vue}'] },
  { name: 'app/ignores', ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    name: 'app/rules',
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'vue/multi-word-component-names': 'off',
    },
  },
  skipFormatting,
)
