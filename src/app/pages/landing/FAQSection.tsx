import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface FAQItem {
  question: string;
  answer: string;
}

export function FAQSection() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      question: t('landing.faq.q1'),
      answer: t('landing.faq.a1'),
    },
    {
      question: t('landing.faq.q2'),
      answer: t('landing.faq.a2'),
    },
    {
      question: t('landing.faq.q3'),
      answer: t('landing.faq.a3'),
    },
    {
      question: t('landing.faq.q4'),
      answer: t('landing.faq.a4'),
    },
    {
      question: t('landing.faq.q5'),
      answer: t('landing.faq.a5'),
    },
    {
      question: t('landing.faq.q6'),
      answer: t('landing.faq.a6'),
    },
    {
      question: t('landing.faq.q7'),
      answer: t('landing.faq.a7'),
    },
    {
      question: t('landing.faq.q8'),
      answer: t('landing.faq.a8'),
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20" style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
            style={{
              backgroundColor: isDark ? 'rgba(124, 58, 237, 0.2)' : 'rgba(124, 58, 237, 0.1)',
            }}
          >
            <HelpCircle className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-purple-500">
              {t('landing.faq.badge')}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
            {t('landing.faq.title')}
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
            {t('landing.faq.subtitle')}
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-xl overflow-hidden transition-all duration-300"
              style={{
                backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                boxShadow: openIndex === index 
                  ? (isDark ? '0 10px 25px -5px rgba(0, 0, 0, 0.3)' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)')
                  : 'none',
              }}
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-5 text-left transition-colors"
                style={{
                  backgroundColor: openIndex === index 
                    ? (isDark ? 'rgba(124, 58, 237, 0.1)' : 'rgba(124, 58, 237, 0.05)')
                    : 'transparent',
                }}
              >
                <span 
                  className="font-semibold pr-4"
                  style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}
                >
                  {faq.question}
                </span>
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    backgroundColor: openIndex === index ? '#7c3aed' : (isDark ? '#334155' : '#e2e8f0'),
                    transform: openIndex === index ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  <ChevronDown 
                    className="w-5 h-5 transition-colors"
                    style={{ color: openIndex === index ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b') }}
                  />
                </div>
              </button>
              <div
                className="overflow-hidden transition-all duration-300"
                style={{
                  maxHeight: openIndex === index ? '500px' : '0',
                  opacity: openIndex === index ? 1 : 0,
                }}
              >
                <div 
                  className="p-5 pt-0"
                  style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                >
                  <div 
                    className="h-px mb-4"
                    style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }}
                  />
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Still Have Questions CTA */}
        <div 
          className="mt-12 p-8 rounded-2xl text-center"
          style={{
            background: isDark 
              ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(79, 70, 229, 0.1) 100%)'
              : 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(79, 70, 229, 0.05) 100%)',
            border: `1px solid ${isDark ? 'rgba(124, 58, 237, 0.3)' : 'rgba(124, 58, 237, 0.2)'}`,
          }}
        >
          <MessageCircle className="w-12 h-12 text-purple-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
            {t('landing.faq.stillHaveQuestions')}
          </h3>
          <p className="mb-6" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
            {t('landing.faq.contactDesc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => window.open('mailto:uwinezajd2@gmail.com')}
            >
              {t('landing.faq.emailSupport')}
            </Button>
            <Button
              variant="outline"
              className="border-purple-600 text-purple-600 hover:bg-purple-50"
              onClick={() => window.open('https://wa.me/250780936645', '_blank')}
            >
              {t('landing.faq.whatsappSupport')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FAQSection;
