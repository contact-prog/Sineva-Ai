import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQSection = () => {
  const faqs = [
    {
      question: 'Do I need any technical skills to use Sineva AI?',
      answer:
        'Not at all! Sineva AI is designed to be incredibly user-friendly. Our AI handles all the technical complexity while you focus on your business goals. Simply tell us what you need, and watch the magic happen.',
    },
    {
      question: 'How does the AI generate content?',
      answer:
        'We use state-of-the-art AI models including GPT-4, DALL-E 3, and Runway for different tasks. Our intelligent routing system automatically selects the best model for each specific job to ensure optimal quality and performance.',
    },
    {
      question: 'Can I cancel my subscription anytime?',
      answer:
        'Absolutely! We believe in earning your business every day. You can cancel your subscription anytime with just one click. No questions asked, no hidden fees, and no long-term commitments required.',
    },
    {
      question: 'What happens after my free trial ends?',
      answer:
        'Your free trial gives you full access to all features for 14 days. When it ends, you can choose a plan that fits your needs or simply walk away - no credit card required to start your trial.',
    },
    {
      question: 'Is my data secure and private?',
      answer:
        'Security is our top priority. We use enterprise-grade encryption, comply with GDPR and SOC 2 standards, and never share your data with third parties. Your content and business information are completely private and secure.',
    },
    {
      question: 'Can I integrate Sineva AI with my existing tools?',
      answer:
        'Yes! We offer integrations with popular platforms like Shopify, WordPress, Google Analytics, Facebook Ads, and more. Our API also allows custom integrations to fit your specific workflow.',
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      <div className="container mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3 }}
          className="text-center mb-16"
        >
          <h2 className="mb-6">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about Sineva AI
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <AccordionItem
                  value={`item-${index}`}
                  className="glass-card border-primary/20 rounded-xl px-6 hover:border-primary/50 transition-all duration-300"
                >
                  <AccordionTrigger className="text-left hover:no-underline py-5">
                    <span className="font-semibold text-foreground">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
