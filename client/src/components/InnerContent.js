// Content.js
import '../imports.js';

const InnerContent = ({ children }) => {
  return (
    <section className="ct-section">
      <div className="w-full centered">
        {children} {/* Alt innhold sendes inn her */}
      </div>
    </section>
  );
};

export default InnerContent;
