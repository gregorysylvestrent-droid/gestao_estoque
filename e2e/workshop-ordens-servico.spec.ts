import { expect, test } from '@playwright/test';

test('carrega tela de ordens de servico sem tela branca', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('ex: admin@nortetech.com').fill('admin@nortetech.com');
  await page.getByPlaceholder('Digite sua senha').fill('admin');
  await page.getByRole('button', { name: /entrar no sistema/i }).click();

  const oficinaCard = page.getByRole('button', { name: /oficina/i }).first();
  try {
    await oficinaCard.waitFor({ state: 'visible', timeout: 8000 });
    await oficinaCard.click();
  } catch {}

  const ordensButton = page.getByRole('button', { name: /ordens de servi/i }).first();
  await expect(ordensButton).toBeVisible();
  await ordensButton.click();

  await expect(page.getByRole('heading', { name: /ordens de servi/i })).toBeVisible();
  await expect(page.getByText(/aguardando/i).first()).toBeVisible();
});
