const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'client', 'src');
const indexCssPath = path.join(srcDir, 'index.css');

// 1. Update index.css
let css = fs.readFileSync(indexCssPath, 'utf8');

// Theme variables
css = css.replace(/--color-itx-canvas: #0a2129;/g, '--color-itx-canvas: #f8fafc;');
css = css.replace(/--color-itx-surface: #0f2f38;/g, '--color-itx-surface: #ffffff;');
css = css.replace(/--color-itx-ink: #eaf3f1;/g, '--color-itx-ink: #0f172a;');
css = css.replace(/--color-itx-muted: #9fb4b8;/g, '--color-itx-muted: #64748b;');
css = css.replace(/--color-itx-border: rgba\(255, 255, 255, 0.12\);/g, '--color-itx-border: rgba(15, 23, 42, 0.1);');
css = css.replace(/--color-itx-navy: #082330;/g, '--color-itx-navy: #e2e8f0;');
css = css.replace(/--color-itx-teal: #2f9db0;/g, '--color-itx-teal: #0ea5e9;');

// Root and Body
css = css.replace(/color: #eaf3f1;/g, 'color: #0f172a;');
css = css.replace(/background: #0a2129;/g, 'background: #f8fafc;');

// Scrollbar
css = css.replace(/scrollbar-color: rgba\(255, 255, 255, 0.28\) transparent;/g, 'scrollbar-color: rgba(15, 23, 42, 0.15) transparent;');
css = css.replace(/background: rgba\(255, 255, 255, 0.28\);/g, 'background: rgba(15, 23, 42, 0.15);');

// Sidebar
css = css.replace(/border-right: 1px solid rgba\(113, 214, 218, 0.12\);/g, 'border-right: 1px solid rgba(15, 23, 42, 0.08);');
css = css.replace(/linear-gradient\(165deg, #061b27 0%, #082733 58%, #0a3540 100%\)/g, 'linear-gradient(165deg, #ffffff 0%, #f1f5f9 58%, #e2e8f0 100%)');
css = css.replace(/rgba\(4, 25, 34, 0.92\)/g, 'rgba(15, 23, 42, 0.06)');

// Admin Nav Link
css = css.replace(/color: rgba\(255, 255, 255, 0.7\);/g, 'color: rgba(15, 23, 42, 0.7);');
css = css.replace(/border-color: rgba\(255, 255, 255, 0.08\);/g, 'border-color: rgba(15, 23, 42, 0.08);');
css = css.replace(/background: rgba\(255, 255, 255, 0.07\);/g, 'background: rgba(15, 23, 42, 0.04);');
css = css.replace(/color: white;/g, 'color: #0f172a;');
css = css.replace(/border-color: rgba\(255, 255, 255, 0.12\);/g, 'border-color: rgba(15, 23, 42, 0.12);');
css = css.replace(/background: rgba\(255, 255, 255, 0.04\);/g, 'background: rgba(15, 23, 42, 0.04);');
css = css.replace(/color: rgba\(255, 255, 255, 0.65\);/g, 'color: rgba(15, 23, 42, 0.65);');
css = css.replace(/background: rgba\(255, 255, 255, 0.08\);/g, 'background: rgba(15, 23, 42, 0.08);');
css = css.replace(/background: rgba\(255, 255, 255, 0.14\);/g, 'background: rgba(15, 23, 42, 0.14);');

// Brand Pass
css = css.replace(/border: 1px solid rgba\(255, 255, 255, 0.72\);/g, 'border: 1px solid rgba(15, 23, 42, 0.1);');

// Shell Topbar
css = css.replace(/border-color: rgba\(255, 255, 255, 0.1\);/g, 'border-color: rgba(15, 23, 42, 0.1);');
css = css.replace(/background: rgba\(10, 33, 41, 0.86\);/g, 'background: rgba(255, 255, 255, 0.86);');
css = css.replace(/rgba\(2, 10, 14, 0.9\)/g, 'rgba(15, 23, 42, 0.08)');

// Portal Surface
css = css.replace(/border-color: rgba\(255, 255, 255, 0.12\);/g, 'border-color: rgba(15, 23, 42, 0.1);');
css = css.replace(/linear-gradient\(145deg, rgba\(20, 54, 63, 0.92\), rgba\(15, 47, 56, 0.9\)\)/g, 'linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9))');
css = css.replace(/inset 0 1px 0 rgba\(255, 255, 255, 0.06\)/g, 'inset 0 1px 0 rgba(255, 255, 255, 0.8)');
css = css.replace(/rgba\(2, 10, 14, 0.95\)/g, 'rgba(15, 23, 42, 0.1)');
css = css.replace(/inset 0 1px 0 rgba\(255, 255, 255, 0.08\)/g, 'inset 0 1px 0 rgba(255, 255, 255, 1)');

// Premium Hero
css = css.replace(/linear-gradient\(135deg, #071e2b 0%, #0b3340 57%, #106a71 100%\)/g, 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 57%, #bae6fd 100%)');
css = css.replace(/rgba\(7, 28, 40, 0.9\)/g, 'rgba(15, 23, 42, 0.05)');

// Portal Ticket
css = css.replace(/background: #0a2129;/g, 'background: #f8fafc;');

// Portal Metric
css = css.replace(/rgba\(2, 10, 14, 0.8\)/g, 'rgba(15, 23, 42, 0.06)');
css = css.replace(/rgba\(2, 10, 14, 0.5\)/g, 'rgba(15, 23, 42, 0.08)');

// App Dialog
css = css.replace(/background: rgba\(7, 28, 40, 0.62\);/g, 'background: rgba(15, 23, 42, 0.2);');

// Booking specific fixes
css = css.replace(/border: 1px solid rgba\(255, 255, 255, 0.09\);/g, 'border: 1px solid rgba(15, 23, 42, 0.05);'); // orbit
css = css.replace(/border: 1px solid rgba\(74, 202, 210, 0.13\);/g, 'border: 1px solid rgba(14, 165, 233, 0.15);'); // orbit one
css = css.replace(/border-color: rgba\(245, 189, 104, 0.12\);/g, 'border-color: rgba(245, 158, 11, 0.15);'); // orbit two
css = css.replace(/background: #2f9db0;/g, 'background: #0ea5e9;'); // booking ticket pseudo elements

// Portal Canvas
css = css.replace(/background-color: #05100f;/g, 'background-color: #f8fafc;');
css = css.replace(/linear-gradient\(135deg, #071e2b 0%, #0a2129 56%, #0b3340 100%\)/g, 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 56%, #e2e8f0 100%)');
css = css.replace(/rgba\(255, 255, 255, 0.03\)/g, 'rgba(15, 23, 42, 0.03)');

// Admin Canvas
css = css.replace(/linear-gradient\(135deg, #071e2b 0%, #0a2129 58%, #0b3340 100%\)/g, 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 58%, #e2e8f0 100%)');

fs.writeFileSync(indexCssPath, css, 'utf8');
console.log('Updated index.css');
