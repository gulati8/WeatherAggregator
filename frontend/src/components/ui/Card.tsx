import { motion, HTMLMotionProps } from 'framer-motion';

interface CardProps extends HTMLMotionProps<'div'> {
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

function Card({ hover = false, padding = 'lg', className = '', children, ...props }: CardProps) {
  return (
    <motion.div
      className={`${hover ? 'card-hover' : 'card'} ${paddingMap[padding]} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default Card;
