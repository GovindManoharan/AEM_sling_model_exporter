package com.aemdemo.core.models;

import java.util.LinkedHashMap;
import java.util.Map;

import javax.inject.Named;

import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.sling.models.annotations.Exporter;
import org.apache.sling.models.annotations.ExporterOption;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.Required;
import org.apache.sling.models.annotations.injectorspecific.OSGiService;
import org.apache.sling.models.annotations.injectorspecific.Self;
import org.apache.sling.models.annotations.injectorspecific.SlingObject;
import org.apache.sling.models.annotations.injectorspecific.ValueMapValue;
import org.apache.sling.models.factory.ModelFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.adobe.cq.export.json.ComponentExporter;
import com.adobe.cq.export.json.SlingModelFilter;
import com.drew.lang.annotations.NotNull;

//import lombok.Data;

//@Data
@Model(

		adaptables = { Resource.class },

		resourceType = "aemdemo/components/page", defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL)

@Exporter(name = "jackson", extensions = "json", options = {
		@ExporterOption(name = "MapperFeature.SORT_PROPERTIES_ALPHABETICALLY", value = "true"),
		@ExporterOption(name = "SerializationFeature.WRITE_DATES_AS_TIMESTAMPS", value = "false"),
		@ExporterOption(name = "SerializationFeature.FAIL_ON_EMPTY_BEANS" ,value ="false")})

public class MobileContentModelExporter {

	private static final Logger LOGGER = LoggerFactory.getLogger(MobileContentModelExporter.class);

	@SlingObject
	@Required
	private ResourceResolver resourceResolver;

	@Self
	private Resource resource;

	@OSGiService
	private ModelFactory modelFactory;

	@Self
	private SlingHttpServletRequest request;

	private Map<String, ? extends ComponentExporter> childrenModels;

	@OSGiService
	private SlingModelFilter slingModelFilter;

	@ValueMapValue
	@Named("jcr:title")
	@Required
	private String title;

	public String getTitle() {
		return title;
	}



	public Map<String, ? extends ComponentExporter> getComponents() {
		if (childrenModels == null) {
			childrenModels = getChildrenModels(request, ComponentExporter.class);
		}
		return childrenModels;
	}

	private <T> Map<String, T> getChildrenModels(@NotNull SlingHttpServletRequest request,
			@NotNull Class<T> modelClass) {
		Map<String, T> models = new LinkedHashMap<>();
		;
		for (Resource child : slingModelFilter.filterChildResources(
				resourceResolver.getResource(resource.getPath() + "/root/container").getChildren())) {

			T model = (T) modelFactory.getModelFromResource(child);

			if (model != null) {
				models.put(child.getName(), model);
			}
		}
		return models;
	}
}
