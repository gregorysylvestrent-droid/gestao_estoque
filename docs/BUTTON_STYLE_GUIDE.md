# Relatório Técnico de UI/UX e Guia de Estilos de Botões

**Projeto:** LogiWMS Pro
**Data:** 10/02/2026
**Responsável:** Trae AI Senior Frontend Engineer

## 1. Análise Situacional (Estado Atual)

Com base na análise do código fonte (`ModuleSelector.tsx`, `WorkOrderKanban.tsx`) e das capturas de tela fornecidas, identificamos o seguinte cenário:

### Pontos Fortes
- **Framework Moderno:** O projeto utiliza **Tailwind CSS**, o que facilita a padronização e manutenção de estilos através de classes utilitárias.
- **Feedback Visual:** Botões principais possuem estados de `:hover` e transições (`transition-colors`, `duration-300`).
- **Hierarquia Visual:** Existe distinção clara entre ações primárias (botões sólidos coloridos) e secundárias/filtros (bordas sutis ou fundos neutros).
- **Adaptação Dark Mode:** O código já prevê classes `dark:` para compatibilidade com tema escuro.

### Pontos de Atenção e Melhoria
- **Descentralização:** Não existe um componente `<Button />` único. Os estilos são repetidos em cada arquivo (ex: `px-4 py-2 bg-blue-500...` em `WorkOrderKanban.tsx`). Isso gera risco de inconsistência a longo prazo.
- **Acessibilidade (a11y):**
  - Alguns botões dependem apenas de ícones ou cores.
  - O contraste do `blue-500` com branco é aceitável (4.5:1), mas `blue-600` seria mais seguro para textos menores.
  - Faltam atributos `aria-label` em botões de ícones (ex: botão de logout).
- **Área de Toque:** Em desktop está adequado, mas em mobile, filtros e botões menores devem garantir o alvo mínimo de 44x44px (iOS/Android Guidelines).

---

## 2. Especificações Técnicas (Novo Padrão)

Para garantir consistência e qualidade sem alterar a lógica do módulo "Armazém", definimos o seguinte padrão para novos desenvolvimentos e refatorações futuras.

### Variáveis de Design (Design Tokens)

Embora usemos Tailwind, conceitualmente estes são os valores:

| Propriedade | Token Tailwind | Valor CSS | Descrição |
|-------------|----------------|-----------|-----------|
| **Primary Color** | `bg-blue-600` | `#2563EB` | Ação principal, alta ênfase. |
| **Hover Color** | `bg-blue-700` | `#1D4ED8` | Estado ao passar o mouse. |
| **Border Radius** | `rounded-lg` | `0.5rem (8px)` | Padrão moderno e amigável. |
| **Transition** | `transition-all duration-200` | `200ms ease-in-out` | Microinterações suaves. |
| **Font Weight** | `font-medium` | `500` | Equilíbrio entre legibilidade e peso. |

### Tipografia e Tamanhos

| Tamanho | Classes Tailwind | Altura | Padding | Texto |
|---------|------------------|--------|---------|-------|
| **Small** | `h-8 px-3 text-xs` | 32px | 0 12px | 12px |
| **Medium** | `h-10 px-4 text-sm` | 40px | 0 16px | 14px |
| **Large** | `h-12 px-6 text-base` | 48px | 0 24px | 16px |

---

## 3. Guia de Implementação (Style Guide)

### Botão Primário (Ação Principal)
Usado para ações positivas e principais da tela (ex: "Nova OS", "Salvar").

```jsx
// Exemplo Tailwind
<button className="h-10 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-medium transition-colors shadow-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2">
  <span>Salvar Alterações</span>
</button>
```

### Botão Secundário (Outline/Ghost)
Usado para ações de menor peso ou cancelamento (ex: "Voltar", "Cancelar", Filtros).

```jsx
// Exemplo Tailwind
<button className="h-10 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors">
  Cancelar
</button>
```

### Botão de Perigo (Danger)
Usado para ações destrutivas (ex: "Excluir", "Arquivar").

```jsx
<button className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
  Excluir Item
</button>
```

### Microinterações e Estados

1.  **Loading**: Deve substituir o texto ou ícone por um `Spinner` e aplicar `opacity-70 cursor-not-allowed`.
2.  **Disabled**: `bg-slate-100 text-slate-400 cursor-not-allowed`.
3.  **Focus**: Sempre manter `focus:ring` para navegação via teclado.

---

## 4. Componente React Sugerido

Para evitar repetição de classes, recomenda-se criar o componente abaixo em `components/ui/Button.tsx`.

> **Nota:** Este componente encapsula todas as regras acima e pode ser usado em novas telas sem afetar o módulo Armazém.

```tsx
import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  leftIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-slate-500",
    outline: "border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 focus:ring-slate-500 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-500 dark:text-slate-400 dark:hover:bg-slate-800",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
    </button>
  );
};
```
