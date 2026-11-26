import { ViteReactSSG } from 'vite-react-ssg'
import './i18n'
import './theme/base.css'
import { routes } from './routes'

export const createRoot = ViteReactSSG({ routes })
