package com.aemdemo.core.models;

import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import javax.annotation.PostConstruct;
import javax.inject.Inject;
import javax.inject.Named;

import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.models.annotations.Default;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.sling.models.annotations.Exporter;
import org.apache.sling.models.annotations.ExporterOption;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.Required;
import org.apache.sling.models.annotations.injectorspecific.InjectionStrategy;
import org.apache.sling.models.annotations.injectorspecific.SlingObject;
import org.apache.sling.models.annotations.injectorspecific.ValueMapValue;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.adobe.cq.dam.cfm.converter.ContentTypeConverter;
import com.adobe.cq.wcm.core.components.internal.models.v1.contentfragment.DAMContentFragmentImpl;
import com.adobe.cq.wcm.core.components.models.contentfragment.DAMContentFragment;
import com.adobe.cq.wcm.core.components.models.contentfragment.DAMContentFragment.DAMContentElement;
import com.drew.lang.annotations.NotNull;
import com.drew.lang.annotations.Nullable;

//import lombok.Data;

//@Data
@Model(

		adaptables = { Resource.class },

		resourceType = "aemdemo/components/contentfragment", defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL)

@Exporter(name = "jackson", extensions = "json", options = {
		@ExporterOption(name = "MapperFeature.SORT_PROPERTIES_ALPHABETICALLY", value = "true"),
		@ExporterOption(name = "SerializationFeature.WRITE_DATES_AS_TIMESTAMPS", value = "false")
		})

public class ContentFragmentModel {

	private static final Logger LOGGER = LoggerFactory.getLogger(ContentFragmentModel.class);

	@ValueMapValue
	@Named("./variationName")
	//@Required
	private String variationName;

	@ValueMapValue
	@Named("./fragmentPath")
	@Default(values = "No Fragement chosen")
	private String fragmentPath;
	



    @Inject
    private ContentTypeConverter contentTypeConverter;
    
    @ValueMapValue(name = "elementNames",
            injectionStrategy = InjectionStrategy.OPTIONAL)
private String[] elementNames;
    
	private String type ;
	 private DAMContentFragment damContentFragment = new EmptyContentFragment();

	@SlingObject
	@Required
	private ResourceResolver resourceResolver;
	
	 @PostConstruct
	    private void initModel() {
	        if (StringUtils.isNotEmpty(fragmentPath)) {
	            Resource fragmentResource = resourceResolver.getResource(fragmentPath);
	            if (fragmentResource != null) {
	                damContentFragment = new DAMContentFragmentImpl(fragmentResource, contentTypeConverter, variationName, elementNames);
	            }
	        }
	    }
	
	
	public Map<Object,Object> getFragmentValues(){
		Map<Object,Object> valList = new HashMap<Object,Object>();
		List<DAMContentElement> elements = this.damContentFragment.getElements();
		Iterator<DAMContentElement> damFragmentItr = elements.iterator();
		while(damFragmentItr.hasNext()) {
			DAMContentElement damElement = damFragmentItr.next();
			valList.put(damElement.getName(), damElement.getValue());
		}

		return valList;
//	return 	this.damContentFragment.getElements().stream().collect(
//                Collectors.toMap(DAMContentElement::getName, DAMContentElement::getValue));
	}
	
	
	public String getFragmentType() {
		return damContentFragment.getType();
	}

	 /**
     * Empty placeholder content fragment.
     */
    private static class EmptyContentFragment implements DAMContentFragment {
        @Override
        public @Nullable String getTitle() {
            return null;
        }

        @Override
        public @Nullable String getDescription() {
            return null;
        }

        @Override
        public @Nullable String getType() {
            return null;
        }

        @Override
        public @Nullable String getName() {
            return null;
        }

        @Override
        public @Nullable List<DAMContentElement> getElements() {
            return null;
        }

        @Override
        public @NotNull Map<String, DAMContentElement> getExportedElements() {
            return new HashMap<>();
        }

        @Override
        public @NotNull String[] getExportedElementsOrder() {
            return new String[0];
        }

        @Override
        public @Nullable List<Resource> getAssociatedContent() {
            return null;
        }
    }
}
