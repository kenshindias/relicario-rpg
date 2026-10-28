import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
const isProjectPage = process.env.GITHUB_ACTIONS === 'true' && repo && !repo.endsWith('.github.io')

export default defineConfig({
  plugins: [react()],
  base: isProjectPage ? `/${repo}/` : '/',
})
