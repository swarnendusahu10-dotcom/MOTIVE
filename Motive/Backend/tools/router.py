def execute_tool(action):

    tool = action.get("tool")

    if tool == "showHotspots":

        district = action.get("district", "Unknown")
        crime = action.get("crime", "Unknown")

        return {
            "message": f"Showing {crime} hotspots for {district}"
        }

    return {
        "message": "Unknown tool"
    }