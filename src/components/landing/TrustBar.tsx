import { motion } from 'framer-motion';

const TrustBar = () => {
  const companies = [
    { name: 'Shopify', logo: '🛍️' },
    { name: 'Stripe', logo: '💳' },
    { name: 'Airbnb', logo: '🏠' },
    { name: 'Uber', logo: '🚗' },
    { name: 'Spotify', logo: '🎵' },
    { name: 'Netflix', logo: '🎬' },
    { name: 'Adobe', logo: '🎨' },
    { name: 'Salesforce', logo: '☁️' },
  ];

  return (
    <section className="py-16 border-t border-border/50">
      <div className="container mx-auto px-6">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-muted-foreground mb-8 font-medium"
        >
          Trusted by innovative companies worldwide
        </motion.p>
        
        <div className="relative overflow-hidden py-4">
          <motion.div
            className="flex gap-16 items-center"
            animate={{
              x: [0, -1200],
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: 'loop',
                duration: 30,
                ease: 'linear',
              },
            }}
          >
            {[...companies, ...companies, ...companies].map((company, index) => (
              <div
                key={index}
                className="flex-shrink-0 flex items-center gap-3 bg-muted/20 px-6 py-3 rounded-lg border border-border/30"
              >
                <span className="text-3xl">{company.logo}</span>
                <span className="text-foreground/80 font-semibold text-lg whitespace-nowrap">
                  {company.name}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TrustBar;
