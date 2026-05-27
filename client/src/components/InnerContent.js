import "../styles/variables.css";
import "../styles/utility.css";

const InnerContent = ({ children }) => {
  return (
    <section className="section">
      <div className="w-full">
        {children} {/* Alt innhold sendes inn her */}
      </div>
    </section>
  );
};

export default InnerContent;
