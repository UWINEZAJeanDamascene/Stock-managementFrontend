import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Quote, Star } from 'lucide-react';
import { testimonialsApi, Testimonial as ApiTestimonial } from '@/lib/api';

// Placeholder testimonials - used when no real testimonials are available
const placeholderTestimonials: ApiTestimonial[] = [
  {
    _id: '1',
    name: "Sarah Johnson",
    role: "Store Manager",
    company: "TechMart Electronics",
    content: "This stock management system has transformed how we track inventory. The real-time updates and barcode scanning have saved us countless hours. Highly recommended for any retail business!",
    rating: 5,
    isActive: true,
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: '2',
    name: "Michael Chen",
    role: "Warehouse Director",
    company: "Global Logistics Inc.",
    content: "The multi-warehouse support is fantastic. We can now manage all our locations from a single dashboard. The reporting tools are incredibly powerful.",
    rating: 5,
    isActive: true,
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: '3',
    name: "Emily Rodriguez",
    role: "Business Owner",
    company: "Sunrise Supermarket",
    content: "Starting with the starter plan was the best decision. It grew with our business, and we easily upgraded to Pro when we needed more features. Excellent customer support!",
    rating: 5,
    isActive: true,
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function TestimonialSection() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [testimonials, setTestimonials] = useState<ApiTestimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const response = await testimonialsApi.getAll();
      if (response.data && response.data.length > 0) {
        setTestimonials(response.data);
      } else {
        setTestimonials(placeholderTestimonials);
      }
    } catch (error) {
      console.log('Using placeholder testimonials:', error);
      setTestimonials(placeholderTestimonials);
    } finally {
      setLoading(false);
    }
  };

  // Display first 3 testimonials (or all if less than 3)
  const displayTestimonials = testimonials.slice(0, 3);

  if (loading) {
    return null;
  }

  return (
    <section id="testimonials" className="py-20" style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
            What Our Customers Say
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
            Join hundreds of satisfied businesses using our stock management solution
          </p>
        </div>

        {/* Testimonial Cards - 3 Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {displayTestimonials.map((testimonial, index) => (
            <div
              key={testimonial._id}
              className="transform transition-all duration-500 hover:scale-105"
              style={{
                animationDelay: `${index * 150}ms`,
              }}
            >
              <div
                className="rounded-2xl p-6 md:p-8 h-full"
                style={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  boxShadow: isDark 
                    ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
                    : '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                }}
              >
                {/* Quote Icon */}
                <div className="flex justify-start mb-4">
                  <div 
                    className="p-2 rounded-full"
                    style={{ backgroundColor: isDark ? '#334155' : '#f1f5f9' }}
                  >
                    <Quote className="w-5 h-5" style={{ color: '#7c3aed' }} />
                  </div>
                </div>

                {/* Content */}
                <p className="text-base md:text-lg mb-6 leading-relaxed" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>
                  "{testimonial.content}"
                </p>

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4"
                      style={{ color: i < testimonial.rating ? '#fbbf24' : (isDark ? '#475569' : '#cbd5e1') }}
                      fill={i < testimonial.rating ? '#fbbf24' : 'none'}
                    />
                  ))}
                </div>

                {/* Author Info */}
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: '#7c3aed' }}
                  >
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
                      {testimonial.name}
                    </h4>
                    <p className="text-xs" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                      {testimonial.role} at {testimonial.company}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* If less than 3 testimonials, show placeholder cards */}
        {displayTestimonials.length < 3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mt-6">
            {[...Array(3 - displayTestimonials.length)].map((_, index) => (
              <div
                key={`placeholder-${index}`}
                className="rounded-2xl p-6 md:p-8 border-2 border-dashed"
                style={{
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                }}
              >
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <Quote className="w-8 h-8 mb-4" style={{ color: isDark ? '#475569' : '#cbd5e1' }} />
                  <p className="text-sm" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                    Add your testimonial here
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default TestimonialSection;
