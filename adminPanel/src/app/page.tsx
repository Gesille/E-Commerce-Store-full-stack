import AppAreaChart from "@/components/AppAreaChart";
import AppBarChart from "@/components/AppBarChart";
import AppPieChart from "@/components/AppPieChart";
import CardList from "@/components/CardList";
import TodoList from "@/components/TodoList";

const Homepage = () => {
  return (
    <div className="grid grid-cols-12 gap-4">

      {/* LEFT BIG CHART */}
      <div className="col-span-12 lg:col-span-7 bg-primary-foreground p-3 rounded-lg">
        <AppBarChart />
      </div>

      {/* RIGHT LIST */}
      <div className="col-span-12 lg:col-span-3 bg-primary-foreground p-3 rounded-lg">
        <CardList title="Latest Transactions" />
      </div>

      {/* RIGHT SMALL WIDGET */}
      <div className="col-span-12 lg:col-span-2 bg-primary-foreground p-3 rounded-lg">
        <AppPieChart />
      </div>

      {/* TODO */}
      <div className="col-span-12 lg:col-span-3 bg-primary-foreground p-3 rounded-lg">
        <TodoList />
      </div>

      {/* AREA CHART BIG CENTER */}
      <div className="col-span-12 lg:col-span-6 bg-primary-foreground p-3 rounded-lg">
        <AppAreaChart />
      </div>

      {/* POPULAR CONTENT */}
      <div className="col-span-12 lg:col-span-3 bg-primary-foreground p-3 rounded-lg">
        <CardList title="Popular Products" />
      </div>

    </div>
  );
};
export default Homepage;
