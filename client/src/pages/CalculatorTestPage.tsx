import { ComprehensiveCalculatorTest } from '@/components/comprehensive-calculator-test';

export default function CalculatorTestPage() {
  return (
    <div className="min-h-screen text-foreground p-4" style={{background: 'var(--bg-gradient)'}}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Comprehensive Calculator Verification
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            End-to-end testing of calculation logic, macro validation, medication adjustments, and live calculator verification
          </p>
        </div>
        
        <ComprehensiveCalculatorTest />
      </div>
    </div>
  );
}